const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const { Console } = require('winston/lib/winston/transports');
const journal_vouchar_router = express.Router();
const app = express();
const port = 3001;

// PostgreSQL pool
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "cdbm_db",
//   password: "pg@12345",
//   port: 5432
// });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT
    }); 

app.use(cors());
app.use(bodyParser.json());

// Endpoint to get accounts
journal_vouchar_router.get('/bookType', async (req, res) => {
  try {
    const result = await pool.query('SELECT book_type FROM cdbm.fin_book_type');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

journal_vouchar_router.get('/branches', async (req, res) => {
  try {
    const result = await pool.query('SELECT branch_cd,branch_name FROM cdbm.branch_master order by branch_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

journal_vouchar_router.get('/Account', async (req, res) => {
  try {
    const result = await pool.query('SELECT act_cd, account_name FROM cdbm.fin_account_master order by account_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

journal_vouchar_router.get('/searchJv', async (req, res) => {
  try {
    const { bookType, fromDate, toDate, accountName, tran_type } = req.query;
    // console.log('Received query parameters:', req.query);

    let query = `SELECT ft.segment, ft.exc_cd, ft.nor_depos, ft.fin_year, ft.branch_cd, ft.cmp_cd, ` +
      ` ft.voucher_no, ft.book_type, ft.trans_date, fm.account_name,ft.act_cd, ft.amount, ft.drcr, fm.activity_cd ` +
      ` FROM cdbm.fin_transactions ft join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd   WHERE trans_type= '` + tran_type + `' `;

    if (accountName) {
      query += ` AND fm.account_name ilike  '%` + accountName + `%'`;
    }

    if (fromDate && toDate) {
      query += ` and to_date(to_char(ft.trans_date, 'YYYY/MM/DD'), 'YYYY/MM/DD') ` +
        ` between to_date('` + fromDate + `', 'YYYY/MM/DD') and ` +
        `      to_date('` + toDate + `', 'YYYY/MM/DD')`
    }


    if (bookType) {
      query += ` AND ft.book_type = '` + bookType + `'`;

    }

    query += ` order by ft.trans_date desc, ft.book_type, ft.voucher_no desc `;


    //console.log('With parameters:', queryParams);
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query:', err.message);
    res.status(500).send('Server error');
  }
});


journal_vouchar_router.get('/searchEditVouchar', async (req, res) => {
  const { segment, exchange, nor_depos, fin_year, cmp_cd, voucherNo, bookType,act_cd ,branchNamecd, activityCode} = req.query;
  // console.log('Received query parameters:', req.query);
//console.log('voucherNo in searchEditVouchar ', voucherNo);

  let lv_query = ` SELECT ft.segment, ft.exc_cd, ft.nor_depos, ft.fin_year, ft.voucher_no, ft.book_type, ft.cmp_cd ` +
    `, (ft.trans_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS trans_date,ft.amount, ft.drcr ` +
    `, ft.narration,(ft.eff_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS eff_date,ft.narr_code,ft.act_cd,fm.account_name act_name ` +
    `,ft.d_add_date FROM cdbm.fin_transactions ft join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd WHERE fin_year = $1 AND `+
    `voucher_no = $2 AND book_type = $3 AND ft.segment ilike  '%` + segment + `%' AND ft.exc_cd = $4 AND ft.nor_depos = $5 ` +
    ` AND fm.activity_cd = '3'`;

  try {
    // console.log('Final query:', lv_query);
    
    const result = await pool.query(lv_query, [fin_year, voucherNo, bookType, exchange, nor_depos]);
    res.json(result.rows);

    // console.log('fin_year, voucherNo, bookType, exchange, nor_depos, activityCode', fin_year, voucherNo, bookType, exchange, nor_depos, activityCode);
    
    // console.log('Query result:', result.rows);

  } catch (err) {
    console.error('Error executing query:', err.message);
    res.status(500).send('Server error');
  }
});

journal_vouchar_router.get('/fin_company/:voucherDate', async (req, res) => {
  const { voucherDate } = req.params;
  // console.log('voucharDate----', voucherDate);

  try {
    // Fetch fin_year_frm, fin_year_to, and fin_year based on voucherDate
    const query = `
    SELECT fin_year 
    FROM cdbm.fin_company 
    WHERE to_date($1,'DD/MM/YYYY') BETWEEN 
to_date(to_char(fin_yr_frm,'DD/MM/YYYY'),'DD/MM/YYYY') AND 
to_date(to_char(fin_yr_to,'DD/MM/YYYY'),'DD/MM/YYYY')`;

    const values = [voucherDate];

    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('Financial year data not found for provided voucher date.');
    }
  } catch (err) {
    console.error('Error fetching financial year data:', err);
    res.status(500).send('Server error');
  }
});




// journal_vouchar_router.get('/exchange', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT exc_name, exc_cd FROM cdbm.DER_EXCHANGE_MASTER');
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


journal_vouchar_router.get('/ddl_exchange', async (req, res) => {
  try {
    const result = await pool.query(`SELECT mii_id, mii_name FROM cdbm.mii_master where mii_catg = 'EXC'`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

journal_vouchar_router.get('/ddl_segment', async (req, res) => {
  try {
    const result = await pool.query('SELECT seg_code, seg_name FROM cdbm.segment_master');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

journal_vouchar_router.get('/ddl_activity', async (req, res) => {
  try {
    const { p_segment_cd } = req.query;
    const result = await pool.query('SELECT activity_cd, act_name FROM cdbm.activity_master WHERE seg_code = $1;', p_Segment);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


journal_vouchar_router.post('/save_journal_voucher', async (req, res) => {

  const { header, details } = req.body;
  const { bookType, voucherDate, effectiveDate, voucherNo, segment, exchange, activityCode, normal_deposit, finYear } = header;
  // Ayaan

  try {
    await pool.query('BEGIN');

    // Check if voucherNo is provided
    if (voucherNo) {
      // Case where voucherNo is provided: Update existing records

      for (let detail of details) {
        const { fin_year, act_name, dr_amount, cr_amount, dr_cr, narration, act_cd, branch_cd, cmp_cd, analyzer_code } = detail;
        let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;

        const insertQuery_fin = `
                    INSERT INTO cdbm.fin_tran_temp
                        (fin_year, trans_date, eff_date, cmp_cd, cb_act_cd, amount, drcr, segment, exc_cd, 
                        nor_depos, narration, act_cd, narr_code, voucher_no,book_type, trans_type)
                    VALUES
                        ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, $6, $7, $8, 
                        $9, $10, $11, $12, $13, $14, $15, $16)`;

        await pool.query(insertQuery_fin, [finYear, voucherDate, effectiveDate, activityCode, null, amount, dr_cr, segment, exchange,
          normal_deposit, narration, act_cd, analyzer_code, voucherNo, bookType, 'JV']);

      }
      await pool.query('CALL cdbm.update_fin_transactions($1, $2, $3, $4, $5, $6, $7)'
        , [finYear, bookType, voucherNo, exchange, segment, activityCode, normal_deposit]);
      await pool.query('COMMIT');

      res.status(200).send('Voucher(s) updated successfully');
    }
    else {
      // Case where no voucherNo is provided: Insert new records
      const selectResult = await pool.query(`
                SELECT fin_year 
                FROM cdbm.fin_company 
                WHERE to_date($1,'YYYY-MM-DD') 
                BETWEEN to_date(to_char(fin_yr_frm,'YYYY-MM-DD'),'YYYY-MM-DD') 
                AND to_date(to_char(fin_yr_to,'YYYY-MM-DD'),'YYYY-MM-DD');
            `, [voucherDate]);

      if (selectResult.rows.length === 0) {
        throw new Error('Financial year not found for the provided voucher date');
      }
      const finYear = selectResult.rows[0].fin_year;

      let newBranch_cd = '';
      // let newsegement = '';
      // let newexchange = '';
      let newcmp_cd = '';

      for (let detail of details) {
        const { branch_cd, cmp_cd } = detail;
        newBranch_cd = branch_cd;
        // newsegement = segment;
        // newexchange = exchange;
        newcmp_cd = cmp_cd;
      }

      // temporarily
      newcmp_cd = '1';
      newBranch_cd = '1';


      // console.log("Parameters for jvnoQuery:", finYear, bookType, newBranch_cd, newcmp_cd, exchange, segment);

      const jvnoQuery = `
                SELECT jv_no 
                FROM cdbm.fin_book_type 
                WHERE fin_year = $1
                    AND book_type = $2 
                    AND activity_code = $3
                    AND seg_code = $4
            `;
      // AND branch_cd = $3 
      // AND cmp_cd = $4 
      const jvnoResult = await pool.query(jvnoQuery, [finYear, bookType, activityCode, segment]);
      // Ayaan header segmetn exchange
      if (jvnoResult.rows.length === 0) {
        throw new Error('JV number not found for the provided criteria');
      }
      const currentJVNo = jvnoResult.rows[0].jv_no;

      const insertQuery = `
        INSERT INTO cdbm.fin_transactions 
            (book_type, trans_date, eff_date, cmp_cd, cb_act_cd, amount, drcr, segment, exc_cd,
             nor_depos, narration, fin_year, act_cd, voucher_no, 
             narr_code, trans_type, d_add_date)
        VALUES 
            ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
            $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, clock_timestamp())`;

      for (let detail of details) {
        // console.log('detail ', detail);
        // console.log('header ', header);
        // console.log('currentJVNo ', currentJVNo);

        const { act_name, dr_amount, cr_amount, dr_cr, narration, act_cd, branch_cd, cmp_cd, analyzer_code } = detail;
        let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;

        await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, activityCode, null, amount, dr_cr,
          segment, exchange, normal_deposit, narration, finYear,
          act_cd, currentJVNo, analyzer_code, 'JV']);
        // Ayaan header segmetn exchange, normal
      }

      const updateJVNoQuery = `
                UPDATE cdbm.fin_book_type 
                SET jv_no = jv_no + 1 
                WHERE fin_year = $1 
                    AND book_type = $2 
                    AND activity_code = $3
                    AND seg_code = $4
            `;

      // AND branch_cd = $3 
      //         AND cmp_cd = $4 

      // console.log('exchange ---> ', exchange);
      // console.log('segment ---> ', segment);

      await pool.query(updateJVNoQuery, [finYear, bookType, activityCode, segment]);
      // console.log('saved');

      await pool.query('COMMIT');
      res.status(200).send('Voucher(s) inserted successfully');
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error processing voucher:', error);
    res.status(500).send('Error processing voucher(s). Please try again.');
  }
});

module.exports = journal_vouchar_router;

