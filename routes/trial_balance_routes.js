const express = require('express');
const trial_balance_router = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const logError = require('../error-logger');
const sqlquery='';
const resulterr = [];

// Load environment variables from .env file
dotenv.config();

// PostgreSQL pool
const pool = new Pool({
user: process.env.DB_USER,
host: process.env.DB_HOST,
database: process.env.DB_DATABASE,
password:process.env.DB_PASSWORD,
port:process.env.DB_PORT
}); 


// CRUD endpoints
trial_balance_router.get('/bal', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM cdbm.bal');
      console.log('result.rows ' , result.rows);
      res.json(result.rows);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

module.exports = trial_balance_router;