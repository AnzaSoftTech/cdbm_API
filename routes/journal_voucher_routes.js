const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
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

journal_vouchar_router.get('/api/branches', async (req, res) => {
  try {
    const result = await pool.query('SELECT branch_cd,branch_name FROM cdbm.branch_master order by branch_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

journal_vouchar_router.get('/api/Account', async (req, res) => {
  try {
    const result = await pool.query('SELECT act_cd,act_name,branch_cd, cmp_cd,type_cd FROM cdbm.fin_account_master order by act_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

journal_vouchar_router.get('/api/searchVouchers', async (req, res) => {
  const { voucherNo, branchNamecd, bookType, fromDate, toDate, accountName } = req.query;
  console.log('Received query parameters:', req.query);

  
  let query = `SELECT ft.segment, ft.exc_cd, ft.nor_depos, ft.fin_year, ft.branch_cd, ft.cmp_cd, ` +
    ` ft.voucher_no, ft.book_type, ft.trans_date, fm.act_name,ft.act_cd, ft.amount, ft.drcr  ` +
    ` FROM cdbm.fin_transactions ft join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd and fm.branch_cd = ft.branch_cd  WHERE 1=1`;

  if (accountName) {
    query += ` AND fm.act_name ilike  '%` + accountName + `%'`;
  }
  if (voucherNo) {
    query += ` AND voucher_no = ` + voucherNo;
  }
  if (branchNamecd) {
    query += ` AND ft.branch_cd = '` + branchNamecd + `'`;
  }

  if (fromDate && toDate) {
    query += ` and to_date(to_char(ft.trans_date, 'YYYY/MM/DD'), 'YYYY/MM/DD') ` +
      ` between to_date('` + fromDate + `', 'YYYY/MM/DD') and ` +
      `      to_date('` + toDate + `', 'YYYY/MM/DD')`
  }


  if (bookType) {
    query += ` AND book_type = '` + bookType + `'`;
    
  }

  try {
    console.log('Final query:', query);
    //console.log('With parameters:', queryParams);
    const result = await pool.query(query);
    res.json(result.rows);
    console.log('Query result:', result.rows);
  } catch (err) {
    console.error('Error executing query:', err.message);
    res.status(500).send('Server error');
  }
});


journal_vouchar_router.get('/api/searchEditVouchar', async (req, res) => {
  const { segment, exchange, nor_depos, fin_year, cmp_cd, voucherNo, bookType,act_cd ,branchNamecd} = req.query;
  console.log('Received query parameters:', req.query);

  
  let lv_query = ` SELECT ft.segment, ft.exc_cd, ft.nor_depos, ft.fin_year, ft.branch_cd, ft.cmp_cd, ` +
    `ft.voucher_no, ft.book_type, (ft.trans_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS trans_date,ft.amount, ft.drcr, ft.narration,(ft.eff_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS eff_date,ft.narr_code,ft.act_cd,fm.act_name,ft.d_add_date ` +
    ` FROM cdbm.fin_transactions ft join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd and fm.branch_cd = ft.branch_cd WHERE 1=1`;

  if (segment) {
    lv_query += ` AND ft.segment ilike  '%` + segment + `%'`;
  }
  if (exchange) {
    lv_query += ` AND ft.exc_cd = '` + exchange + `'`;
  }
  if (nor_depos) {
    lv_query += ` AND ft.nor_depos = '` + nor_depos + `'`;
  }
  if (voucherNo) {
    lv_query += ` AND voucher_no = ` + voucherNo;
  }
  if (fin_year) {
    lv_query += ` AND fin_year = ` + fin_year;
  }
  if (cmp_cd) {
    lv_query += ` AND ft.cmp_cd = ` + cmp_cd;
  }
 
  if (bookType) {
    lv_query += ` AND book_type = '` + bookType + `'`;
    
  }
  if (act_cd) {
    lv_query += ` AND ft.act_cd = '` + act_cd + `'`;
    
  }
  if (branchNamecd) {
    lv_query += ` AND ft.branch_cd = '` + branchNamecd + `'`;
  }

  try {
    console.log('Final query:', lv_query);
    
    const result = await pool.query(lv_query);
    res.json(result.rows);
    console.log('Query result:', result.rows);
  } catch (err) {
    console.error('Error executing query:', err.message);
    res.status(500).send('Server error');
  }
});





journal_vouchar_router.get('/fin_company/:voucherDate', async (req, res) => {
  const { voucherDate } = req.params;
  console.log('voucharDate----', voucherDate);

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




journal_vouchar_router.get('/exchange', async (req, res) => {
  try {
    const result = await pool.query('SELECT exc_name, exc_cd FROM cdbm.DER_EXCHANGE_MASTER');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


journal_vouchar_router.post('/save_journal_voucher', async (req, res) => {
    const { header, details } = req.body;
    const { bookType, voucherDate, effectiveDate, voucherNo, segment, exchange, normal_deposit} = header;
  // Ayaan
  
    // console.log('save_journal_voucher req.body --->> ', req.body);
    // console.log('exchange ..>', exchange);
  
    try {
      await pool.query('BEGIN');
      console.log('voucharNo', voucherNo);
  
      // Check if voucherNo is provided
      if (voucherNo) {
        // Case where voucherNo is provided: Update existing records
        console.log('1');
        for (let detail of details) {
          const { fin_year, act_name, dr_amount, cr_amount, dr_cr, narration, act_cd, branch_cd, cmp_cd, analyzer_code } = detail;
          let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;
          console.log('2');
          const insertQuery_fin = `
                    INSERT INTO cdbm.fin_tran_temp
                        (fin_year, trans_date, eff_date, cb_act_cd, amount, drcr, segment, exc_cd, 
                        nor_depos, narration, act_cd, branch_cd, cmp_cd, narr_code, voucher_no,book_type)
                    VALUES
                        ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, $6, $7, $8, 
                        $9, $10, $11, $12, $13, $14, $15, $16)
                  `;
          console.log('3');
          await pool.query(insertQuery_fin, [fin_year, voucherDate, effectiveDate, null, amount, dr_cr, segment, exchange, normal_deposit, narration, act_cd, branch_cd, cmp_cd, analyzer_code, voucherNo, bookType]);
  
        }
        console.log('4');
        await pool.query('CALL cdbm.update_fin_temp($1, $2, $3, $4)', [details[0].fin_year, bookType, voucherNo, details[0].branch_cd]);
        console.log('5');
  
        console.log('6');
        await pool.query('COMMIT');
        res.status(200).send('Voucher(s) updated successfully');
      } else {
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
          const {branch_cd, cmp_cd } = detail;
          newBranch_cd = branch_cd;
          // newsegement = segment;
          // newexchange = exchange;
          newcmp_cd = cmp_cd;
        }

        // temporarily
        newcmp_cd = '1';
        newBranch_cd = '1';

  
        console.log("Parameters for jvnoQuery:", finYear, bookType, newBranch_cd, newcmp_cd, exchange, segment);
  
        const jvnoQuery = `
                SELECT curr_jvno 
                FROM cdbm.fin_book_type 
                WHERE fin_year = $1
                    AND book_type = $2 
                    AND exc_cd = $3
                    AND segment = $4
            `;
            // AND branch_cd = $3 
            // AND cmp_cd = $4 
        const jvnoResult = await pool.query(jvnoQuery, [finYear, bookType, exchange, segment]);
        // Ayaan header segmetn exchange
        if (jvnoResult.rows.length === 0) {
          throw new Error('JV number not found for the provided criteria');
        }
        const currentJVNo = jvnoResult.rows[0].curr_jvno;
  
        const insertQuery = `
        INSERT INTO cdbm.fin_transactions 
            (book_type, trans_date, eff_date, cb_act_cd, amount, drcr, segment, exc_cd,
             nor_depos, narration, fin_year, branch_cd, cmp_cd, act_cd, voucher_no, 
             narr_code, trans_type, d_add_date)
        VALUES 
            ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
            $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, clock_timestamp())`;
  
        for (let detail of details) {
          const { act_name, dr_amount, cr_amount, dr_cr, narration, act_cd, branch_cd, cmp_cd, analyzer_code } = detail;
          let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;
  
          await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, null, amount, dr_cr,
                                         segment, exchange, normal_deposit, narration, finYear, 
                                         branch_cd, cmp_cd, act_cd, currentJVNo, analyzer_code, 'JV']);
                // Ayaan header segmetn exchange, normal
        }
  
        const updateJVNoQuery = `
                UPDATE cdbm.fin_book_type 
                SET curr_jvno = curr_jvno + 1 
                WHERE fin_year = $1 
                    AND book_type = $2 
                    AND exc_cd = $3
                    AND segment = $4
            `;
  
            // AND branch_cd = $3 
            //         AND cmp_cd = $4 

        // console.log('exchange ---> ', exchange);
        // console.log('segment ---> ', segment);

        await pool.query(updateJVNoQuery, [finYear, bookType, exchange, segment]);
  
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

