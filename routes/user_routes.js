const express = require('express');
const user_router = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');
//const { logError } = require('../logger');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const logError = require('../error-logger');
  
user_router.use(cors());

const sqlquery='';
const resulterr = [];

// Load environment variables from .env file
dotenv.config();

var bcrypt = require('bcrypt');
// PostgreSQL pool
const pool = new Pool({
user: process.env.DB_USER,
host: process.env.DB_HOST,
database: process.env.DB_DATABASE,
password:process.env.DB_PASSWORD,
port:process.env.DB_PORT
}); 
//console.log('-----------',process.env.DB_PASSWORD);
/* 
// PostgreSQL pool
const pool = new Pool({
user: "postgres",
host: "localhost",
database: "my_database",
password: "sasa",
port:5432
});*/
// Load environment variables from .env file
//dotenv.config();

//const baseURL = process.env.BASE_URL;
/* console.log('urldk:',baseURL);
// Example user data
let users = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Doe' },
]; */

/* // Get all users
user_router.get('/', (req, res) => {
    res.json(users);
}); */
// Example route
user_router.get('/example', (req, res) => {
  res.send('Hello World!');
}); 

// Endpoint to get accounts
user_router.get('/accounts', async (req, res, next) => {
 
  try {
    sqlquery ='SELECT id, account_name FROM public.account';
    //console.log(query);
    var result = await pool.query(sqlquery);
    res.json(result.rows);
    resulterr = result.rows;
  } catch (err) {    
    //next(err);
    logError(err, req);
    //logError(err, 'accounts', sqlquery, 'resulterr');
    res.status(500).json({ error: err.message });
  }
});

const secret = 'abcdefghijklmnopqrstuvwxyz';
var userid = 0;

user_router.post('/login', async (req, res) => {

  const { username, password } = req.body;
  //console.log(req.body);
  //console.log('login called');

  try{
  
  const result = await pool.query('SELECT * FROM cdbm.users WHERE username = $1', [username]);
  //console.log('login called result ===> ', result.rows.length);

  if (result.rows.length > 0) {
    const user = result.rows[0];
    userid = user.id;
    ////const validPassword = await bcrypt.compare(password, user.password);
    if (password != user.password)
    {
      res.json({ message: 'Invalid password' });
    }
    else
    {
      res.json({ message: 'Valid' });
    }
   //const hashedPassword = await bcrypt.hash(password, 10);
    //console.log(password);
    //console.log(hashedPassword);
    // // if (validPassword) {
    // //   console.log('if validpassword');
    // //   const token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '1h' });
    // //   console.log('after token ', token);
    // //   //console.log('token:'+token);
    // //   res.json({ token });
    // // } else {
    // //   //res.status(401).json({ message: 'Invalid password' });
    // //   res.json({ message: 'Invalid password' });
    // // }
  } else {
    //res.status(404).json({ message: 'User not found' });
    res.status.json({ message: 'User not found' });
  } 

}catch (err) { 
  console.log('ecxception err ', err);
}

}      


);

user_router.post('/signup', async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO cdbm.users (username, password, role) VALUES ($1, $2, $3)', [username, hashedPassword, role]);
  res.status(201).json({ message: 'User created' });
});

user_router.get('/projects', async (req, res) => {
  const userId = userid;
  //const userId = 1;
  //console.log('user:'+ userId);
  const result = await pool.query('SELECT * FROM cdbm.projects WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 5', [userId]);
  //console.log(JSON.stringify(result.rows));
  res.json(result.rows);
});

// const authenticateJWT = (req, res, next) => {
//   const token = req.headers.authorization.split(' ')[1];  
//   if (token) {
//     jwt.verify(token, secret, (err, user) => {     
//       if (err) {
//         console.log(err.message);
//         return res.sendStatus(403);
//       }
//       req.userId = user.id;
//       req.userRole = user.role;
//       next();
//     });
//   } else {
//     res.sendStatus(401);
//   }
// };

// user_router.use(authenticateJWT);

user_router.get('/menu', (req, res) => {
  const menu = require('../utility/menu.json');
  if (req.userRole === 'admin') {
    res.json(menu);
  } else if (req.userRole === 'broker') {
    const filteredMenu = menu.filter(item => item.role === 'broker');
    res.json(filteredMenu);
  }
});

 
module.exports = user_router;
