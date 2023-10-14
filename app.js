const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const path = require("path");
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;
const initializerDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server running at http://localhost:3000/`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializerDbAndServer();

//Authenticate Access Token
const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "SECRET", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid Access Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//Get Books API
app.get("/books/", authenticateToken, async (request, response) => {
  const getBooksQuery = `
        SELECT * FROM book ORDER BY book_id;
    `;

  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

//Get Book API
app.get("/books/:bookId/", authenticateToken, async (request, response) => {
  const { bookId } = request.params;
  const getBook = `
    SELECT * FROM book WHERE book_id = ${bookId}
    `;
  const book = await db.get(getBook);
  response.send(book);
});

//Get Profile API
app.get("/profile/", authenticateToken, async (request, response) => {
  const { username } = request;

  const getUser = `
    SELECT 
    * FROM user where username = '${username}';
    `;

  const dbUser = await db.get(getUser);
  response.send(dbUser);
});

//Register User API
app.post("/users/", async (request, response) => {
  const { name, username, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const getUserQuery = `
    SELECT * 
    FROM 
        user
    WHERE 
        username = '${username}';
    `;

  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    const createUserQuery = `
        INSERT INTO 
            user(name, username, password, gender, location)
        VALUES(
            '${name}', '${username}', '${hashedPassword}', '${gender}', '${location}'
        );
    `;
    await db.run(createUserQuery);
    response.send("User Created Successfully");
  } else {
    response.status(400);
    response.send("User Already Exists");
  }
});

//Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const getUserQuery = `
      SELECT * 
      FROM
        user
    WHERE 
        username = '${username}';
    `;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    isPasswordMatch = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatch) {
      const payload = { username };
      const jwtToken = jwt.sign(payload, "SECRET");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});
