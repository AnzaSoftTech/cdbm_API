const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const common_router = express.Router();
const app = express();
const port = 3001;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT
    }); 

app.use(cors());
app.use(bodyParser.json());

common_router.get('/bookType', async (req, res) => {
    try {
      const result = await pool.query('SELECT book_type FROM cdbm.fin_book_type order by 1');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  common_router.get('/bookType_multi_ddl', async (req, res) => {
    try {
      const result = await pool.query(`SELECT '''' || book_type || '''' book_type, description FROM cdbm.fin_book_type WHERE seg_code = 'C' order by 1`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  common_router.get('/ddl_activity_master', async (req, res) => {
    try {
  
      let query = `SELECT activity_cd, act_name  ` +
                 ` FROM cdbm.activity_master ` + 
                 ` order by activity_cd; ` ;
  
        const result = await pool.query(query);
        res.json(result.rows);
  
    } catch (error) {
        console.log('error activity_master', error);
      //  logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
  
  common_router.get('/exchange', async (req, res) => {
    try {
      const result = await pool.query(`SELECT mii_id, mii_name FROM cdbm.mii_master where mii_catg = 'EXC' ORDER BY 2;`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  common_router.get('/ddl_activitywise_exchange', async (req, res) => {
    try {
      
      const {p_activity_cd} = req.query;

      //console.log('ddl_activitywise_exchange => ', p_activity_cd);

      const result = await pool.query(`SELECT mii_id exc_cd, mii_name exc_name FROM cdbm.mii_master where activity_code = $1 and ` +
                                      ` mii_catg = 'EXC' ORDER BY 2;`, [p_activity_cd]);

      //console.log('ddl_activitywise_exchange => result.rows ', result.rows);
      res.json(result.rows);
    } catch (err) {
      console.log('Error in ddl_activitywise_exchange', err);
      res.status(500).json({ error: err.message });
    }
  });

  common_router.get('/ddl_exchangewise_segment', async (req, res) => {
    try {
      
      const {p_Exc_Code} = req.query;
      //console.log('p_Exc_Code', p_Exc_Code);
      const result = await pool.query(`select ms.seg_code seg_code, sm.seg_name seg_name 
                                       FROM cdbm.mii_segment ms 
                                       join cdbm.segment_master sm on sm.seg_code = ms.seg_code
                                        where ms.mii_id = $1 order by sm.seg_name;`, [p_Exc_Code]);
      //console.log('ddl_activitywise_exchange => result.rows ', result.rows);
      res.json(result.rows);
      console.log('result.rows', result.rows);
    } catch (err) {
      console.log('Error in ddl_exchangewise_segment', err);
      res.status(500).json({ error: err.message });
    }
  });


  module.exports = common_router;
