const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const seg_mast_router = express.Router();
const port = 3001;


// PostgreSQL pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

seg_mast_router.post('/save_segment', async (req, res) => {
    const { header } = req.body;
    const { segCode, stdVal, segName, startDate, endDate, editMode, userId } = header;

    if (!header) {
        return res.status(400).send('Missing header object');
    }
    else {
        try {
            await pool.query('BEGIN');

            var lv_success = '1';

            if (editMode === 'N') {
                const query = await pool.query(`select count(1) cnt from CDBM.SEGMENT_MASTER where seg_code = $1;`, [segCode]);
                var lv_cnt = query.rows[0].cnt;

                if (lv_cnt > 0) {
                    lv_success = '9';
                }
                else {
                    const insertQuery = `INSERT INTO CDBM.SEGMENT_MASTER 
              (seg_code, std_val, seg_name, seg_start_date, seg_end_date, add_user_id, add_date)
            VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp())`;
                    await pool.query(insertQuery, [segCode, stdVal, segName, startDate, endDate === '' ? null : endDate, userId]);
                }

            }
            else if (editMode === 'Y') {
                const updateQuery = `UPDATE CDBM.SEGMENT_MASTER SET std_val = $1, seg_name = $2, seg_start_date = $3, seg_end_date = $4, `+
                    `upd_user_id = $5, upd_date = clock_timestamp() WHERE seg_code = $6;`;
                await pool.query(updateQuery, [stdVal, segName, startDate, endDate, userId, segCode]);
            }
            res.json({ message: lv_success });

            await pool.query('COMMIT');

        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Error inserting or updating segment:', error);
            res.status(500).send('Error processing segment. Please try again.');
        }
    }
});

seg_mast_router.get('/serach_segment', async (req, res) => {
    // const { p_book_type } = req.query;
  
    let query = `select seg_code, std_val, seg_name, to_char(seg_start_date, 'yyyy-MM-dd') seg_start_date
                  , to_char(seg_end_date, 'yyyy-MM-dd')  seg_end_date from CDBM.SEGMENT_MASTER order by seg_code`;
  
    try {
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query:', err.message);
      res.status(500).send('Server error');
    }
  });

app.use(cors());
app.use(bodyParser.json());



module.exports = seg_mast_router;
