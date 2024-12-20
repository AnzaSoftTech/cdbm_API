const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const booktype_mast_routes = express.Router();
const port = 3001;


// PostgreSQL pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT
    }); 

app.use(cors());
app.use(bodyParser.json());

booktype_mast_routes.get('/ddl_segment_master', async (req, res) => {
    try {
  
      let query = `SELECT seg_code, seg_name ` +
        ` FROM cdbm.segment_master order by seg_code; `;
  
      const result = await pool.query(query);
      res.json(result.rows);
  
    } catch (error) {
      // logError(error, req);
      // console.log('ddl_segment_master >>', error)
      res.status(500).send(error.message);
    }
  });
  
  booktype_mast_routes.get('/ddl_activity_master', async (req, res) => {
    try {
  
      const { p_segment_cd } = req.query;
  
      // .consolelog('p_segment_cd server >>> ', p_segment_cd);
  
      let query = `SELECT activity_cd, act_name  ` +
        ` FROM cdbm.activity_master ` +
        ` WHERE seg_code = '` + p_segment_cd + `'` +
        ` order by activity_cd; `;
  
      const result = await pool.query(query);
      res.json(result.rows);
  
    } catch (error) {
      // console.log('error  >>>>>', error);
      //  logError(error, req);
      res.status(500).send(error.message);
    }
  });
  
  booktype_mast_routes.post('/save_bookType', async (req, res) => {
    const { header } = req.body;
    const { activityCode, segment, bookType, jvNo, bookTypeDesc, endDate, userId } = header;
  
    try {
      await pool.query('BEGIN');
      // Retrieve the current financial year
      const lv_finyear_query = await pool.query('SELECT max(fin_year) AS fin_year FROM cdbm.fin_company');
  
      if (lv_finyear_query.rows.length === 0 || !lv_finyear_query.rows[0].fin_year) {
        throw new Error('Financial year not found');
      }
  
      const lv_fin_year = lv_finyear_query.rows[0].fin_year;
  
      // Check if the book type already exists
      const lv_data_exist = await pool.query(`
        SELECT count(1) AS cnt_row 
        FROM cdbm.fin_book_type 
        WHERE book_type = $1 AND fin_year = $2`, 
        [bookType, lv_fin_year] 
      );
  
      const recordExists = lv_data_exist.rows[0].cnt_row > 0;
  
      if (recordExists) {
        // console.log('Updating existing book type...');
        // console.log('jvNo--------+++',jvNo);
        const lv_upd_statement = `
          UPDATE cdbm.fin_book_type 
          SET seg_code = $1, activity_code = $2, jv_no = $3, description = $4, end_date = $5, 
              upd_user_id = $6, upd_date = clock_timestamp()
          WHERE book_type = $7 AND fin_year = $8`;
  
        await pool.query(lv_upd_statement, [
          segment, 
          activityCode, 
          jvNo?jvNo:0, 
          bookTypeDesc, 
          endDate?endDate:null, 
          userId, 
          bookType,
          lv_fin_year
        ]);
        res.json({ message: 'Book type updated successfully.' });
      } else {
        // Prepare bookType for insertion
       // console.log('jvNo--------+++',jvNo);
        const insertQuery = `
          INSERT INTO cdbm.fin_book_type 
            (fin_year, book_type, seg_code, activity_code, jv_no, description, end_date, add_user_id, add_date)
          VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, clock_timestamp())`;
          
        await pool.query(insertQuery, [
          lv_fin_year, 
          bookType, 
          segment, 
          activityCode, 
          1, 
          bookTypeDesc, 
          endDate?endDate:null, 
          userId
        ]);
        res.json({ message: 'Book type saved successfully.' });
      }
  
      await pool.query('COMMIT');
  
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting or updating book type:', error);
      res.status(500).send('Error processing book type. Please try again.');
    }
  });
  
  
  booktype_mast_routes.get('/search_BookType', async (req, res) => {
    const { p_book_type } = req.query;
  
    let query = `select fbt.fin_year fin_year, fbt.book_type book_type, fbt.description book_type_desc, ` +
      ` fbt.seg_code seg_code, am.act_name actvity, fbt.jv_no, fbt.end_date end_date, fbt.activity_code` +
      ` from CDBM.FIN_BOOK_TYPE fbt  ` +
      ` join cdbm.activity_master am on am.activity_cd = fbt.activity_code ` +
      ` where UPPER(fbt.book_type) like UPPER('%` + p_book_type + `%')  ` +
      ` order by fbt.fin_year desc, fbt.book_type asc;`;
  
    try {

        const result = await pool.query(query);
      res.json(result.rows);

    } catch (err) {
      console.error('Error executing query:', err.message);
      res.status(500).send('Server error');
    }
  });
  



module.exports = booktype_mast_routes;
