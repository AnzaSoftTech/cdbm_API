const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const payment_voucher_router = express.Router();
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

// Endpoint to get accounts
payment_voucher_router.get('/bookType', async (req, res) => {
  try {
    const result = await pool.query('SELECT book_type FROM cdbm.fin_book_type');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

payment_voucher_router.get('/cash_bank_master', async (req, res) => {
  try {
    //const { p_book_type, p_exchange, p_segment, p_branch_cd } = req.query;

    let query = `SELECT cb_act_cd, bank_name || ' ( ' || bank_act_no || ')' bank_ac_name ` +
      ` FROM cdbm.fin_cash_bank_master order by bank_name `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

payment_voucher_router.get('/populatedetails', async (req, res) => {
  try {
    const { p_cb_act_cd } = req.query;
    const result = await pool.query(`SELECT branch_cd, exc_cd, segment, book_type FROM cdbm.fin_cash_bank_master where cb_act_cd = '` +
      p_cb_act_cd + `'`);
    //console.log(result.rows);
    return res.json(result.rows);
  } catch (err) {
    console.log('error in populatedetails ==== ', err);
    res.status(500).json({ error: err.message });
  }
});


payment_voucher_router.get('/NSE_Bank_AnalyzerCode', async (req, res) => {
  try {
    const result = await pool.query('SELECT narr_code, narr_desc FROM cdbm.fin_narration_master where ana_grp_cd = 1 order by narr_desc');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

payment_voucher_router.get('/NSE_Client_AnalyzerCode', async (req, res) => {
  try {
    const result = await pool.query('SELECT narr_code, narr_desc FROM cdbm.fin_narration_master where ana_grp_cd = 2 order by narr_desc');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

payment_voucher_router.get('/SSL_AnalyzerCode', async (req, res) => {
  try {
    const result = await pool.query('SELECT narr_code, narr_desc FROM cdbm.fin_narration_master where ana_grp_cd = 3 order by narr_desc');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


payment_voucher_router.get('/branches', async (req, res) => {
  try {
    const result = await pool.query('SELECT branch_cd,branch_name FROM cdbm.branch_master order by branch_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

payment_voucher_router.get('/Account', async (req, res) => {
  try {
    const result = await pool.query('SELECT act_cd,act_name FROM cdbm.fin_account_master order by act_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

payment_voucher_router.get('/searchAccount', async (req, res) => {
  const { exchange, segment, name } = req.query;
  let queryParams = [];
  let query = 'SELECT act_cd, act_name, branch_cd, cmp_cd, type_cd FROM cdbm.fin_account_master WHERE 1=1';

  if (exchange) {
    query += ' AND exc_cd = $1';
    queryParams.push(exchange);
  }
  if (segment) {
    query += ' AND segment = $2';
    queryParams.push(segment);
  }
  if (name) {
    query += ' AND act_name ILIKE $3';
    queryParams.push(`%${name}%`);
  }

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

payment_voucher_router.get('/searchVouchers', async (req, res) => {
  const { accountNamecd, voucherNo, branchNamecd, bookType, fromDate, toDate } = req.query;
  console.log('data====', req.query)
  let queryParams = [];
  let query = 'SELECT book_type, trans_date, eff_date, cb_act_cd,amount, drcr, segment, exc_cd exchange, nor_depos normal_deposit, narration, fin_year, branch_cd, cmp_cd, act_cd, voucher_no,narr_code FROM cdbm.fin_transactions WHERE 1=1';

  if (accountNamecd) {
    query += ' AND act_cd = $1';
    queryParams.push(accountNamecd);
  }
  if (voucherNo) {
    query += ' AND voucher_no = $2';
    queryParams.push(voucherNo);
  }
  if (branchNamecd) {
    query += ' AND branch_cd ILIKE $3';
    queryParams.push(`%${branchNamecd}%`);
  }
  // if (fromDate && toDate) {
  //   query += ' AND trans_date >= $4::date AND trans_date <= $5::date';
  //   queryParams.push(fromDate, toDate);
  // } else if (fromDate) {
  //   query += ' AND trans_date >= $4::date';
  //   queryParams.push(fromDate);
  // } else if (toDate) {
  //   query += ' AND trans_date <= $4::date';
  //   queryParams.push(toDate);
  // }

  if (bookType) {
    query += ' AND book_type ILIKE $4';
    queryParams.push(`%${bookType}%`);
  }

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

payment_voucher_router.get('/fin_company/:voucherDate', async (req, res) => {
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

payment_voucher_router.get('/exchange', async (req, res) => {
  try {
    const result = await pool.query('SELECT exc_name, exc_cd FROM cdbm.DER_EXCHANGE_MASTER');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

payment_voucher_router.get('/bill_master', async (req, res) => {
  try {
    console.log('1');

    // Extract 'act_cd' from query parameters
    const { actCd } = req.query;
    console.log('actCd:', actCd);

    // Convert actCd to an array if it's not already
    const actCdArray = Array.isArray(actCd) ? actCd : [actCd];
    console.log('actCdArray:', actCdArray);

    // Create a parameterized query to handle multiple values safely
    const query = `
      SELECT * 
      FROM cdbm.vendor_bills 
      WHERE supplier_id = ANY($1::text[])
      and pay_voucher_no IS NULL
    `;
    const values = [actCdArray];

    // Execute the parameterized query
    const result = await pool.query(query, values);

    console.log('2');
    console.log('result', result.rows)
    return res.json(result.rows);

  } catch (err) {
    console.log('error in VENDOR_BILLS ==== ', err);
    res.status(500).json({ error: err.message });
  }
});


payment_voucher_router.post('/voucher', async (req, res) => {
  const { header, details, vendorDetails } = req.body;
  //const { bookType, voucherDate, effectiveDate, TransactionType, userId } = header;
  const {cbaccount,
    voucherNo,
    voucherDate,
    effectiveDate,
    paymentMode,
    payeeName,
    refNo,
    chequeNo,
    nsebankanalyzerCode,
    analyzerCode,
    amount,
    narration,
    bookType,
    userId,
    TransactionType} = header;


  console.log('req.body ====> ', req.body);

  try {
    await pool.query('BEGIN');

    

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
    let newsegement = '';
    let newexchange = '';
    let newcmp_cd = '';

    for (let detail of details) {
      const { segment, exchange, branch_cd, cmp_cd } = detail;
      newBranch_cd = branch_cd;
      newsegement = segment;
      newexchange = exchange;
      newcmp_cd = cmp_cd;
    }
    console.log("Parameters for jvnoQuery:", finYear, bookType, newBranch_cd,newcmp_cd, newexchange, newsegement);

    const jvnoQuery = `
              SELECT curr_jvno 
              FROM cdbm.fin_book_type 
              WHERE fin_year = $1
                  AND book_type = $2 
                  AND branch_cd = $3 
                  AND cmp_cd = $4 
                  AND exc_cd = $5 
                  AND segment = $6
          `;

    const jvnoResult = await pool.query(jvnoQuery, [finYear, bookType, newBranch_cd,newcmp_cd, newexchange, newsegement]);
    if (jvnoResult.rows.length === 0) {
      throw new Error('JV number not found for the provided criteria');
    }
    const currentJVNo = jvnoResult.rows[0].curr_jvno;

    const cash_bank_dtls = `select branch_cd, cmp_cd, exc_cd, segment from cdbm.fin_cash_bank_master ` +
                           ` where cb_act_cd = '` + cbaccount + `'`;

    const cb_result = await pool.query(cash_bank_dtls);

    const hdr_branch_cd = cb_result.rows[0].branch_cd;
    const hdr_exc_cd = cb_result.rows[0].exc_cd;
    const hdr_cmp_Cd = cb_result.rows[0].cmp_cd;
    const hdr_segment = cb_result.rows[0].segment;
    const hdr_nor_dep = "N";

    const insertQueryheader = `
    INSERT INTO cdbm.fin_transactions 
        (book_type, trans_date, eff_date, cb_act_cd, amount, drcr, segment, exc_cd, nor_depos, 
          narration, fin_year, branch_cd, cmp_cd, voucher_no, narr_code, trans_type, n_add_user_id, nse_narr_code)
    VALUES 
        ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`;

        var header_dr_cr = "";

    if (TransactionType === "Payment")
    {
        header_dr_cr = "Dr"
    }
    else {
        header_dr_cr = 'Cr'
    }

    await pool.query(insertQueryheader, [bookType, voucherDate, effectiveDate, cbaccount, amount, header_dr_cr, hdr_segment, hdr_exc_cd, hdr_nor_dep,
            narration, finYear, hdr_branch_cd, hdr_cmp_Cd, currentJVNo, analyzerCode, TransactionType, userId, nsebankanalyzerCode]);

     const insertQuery = `
            INSERT INTO cdbm.fin_transactions 
                (book_type, trans_date, eff_date, act_cd, amount, drcr, segment, exc_cd, nor_depos, 
                  narration, fin_year, branch_cd, cmp_cd, voucher_no, narr_code, trans_type, n_add_user_id, nse_narr_code)
            VALUES 
                ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
                $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`;

    for (let detail of details) {
      const { act_name, dr_amount, cr_amount, dr_cr, segment, exchange, noraml_deposit, narration,
              act_cd, branch_cd, cmp_cd,analyzer_code, nse_clnt_analyzer_code } = detail;
      let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;

    
  
          //console.log('insertQuery ==> ', insertQuery);
      await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, act_cd, amount, dr_cr, segment, exchange, noraml_deposit,
                       narration, finYear, branch_cd, cmp_cd, currentJVNo, analyzer_code, TransactionType, userId,  nse_clnt_analyzer_code]);
    }
    
    for (let vendorDetail of vendorDetails) {
      const { bill_id, sr_no, invoice_no, invoice_date, supplier_id, invoice_type,
        reverse_charges, invoice_value, taxable_value, gst_rate, sgst_amt,
        cgst_amt, igst_amt, tds_perc, tds_section, tds_amt, book_type,
        voucher_no, voucher_date, pending_amount, payment_amt, balance_amt,
        pay_book_type, pay_voucher_no, pay_voucher_date } = vendorDetail;
      console.log('bill_id', bill_id);
      console.log('invoice_no', invoice_no);
      console.log('payment_amt', payment_amt);
      console.log('pending_amt', pending_amount);
      const paymentAmount = parseFloat(payment_amt);
      const pendingAmount = parseFloat(pending_amount);
      const updateVendorBillQuery = await pool.query(`
      UPDATE cdbm.vendor_bills
      SET payment_amt = $1,
          balance_amt = $4::numeric - $1::numeric,
          pay_voucher_no=$6
      WHERE bill_id = $2
        AND invoice_no = $3
        AND sr_no = $5
     `, [paymentAmount, bill_id, invoice_no, pendingAmount,sr_no,currentJVNo]);

      console.log('Update successful:', updateVendorBillQuery.rowCount);
    
    if (pending_amount - payment_amt != 0 && balance_amt==0) {
      const insertVendorBillQuery = await pool.query(`
    INSERT INTO cdbm.vendor_bills (
        bill_id, sr_no, invoice_no, invoice_date, supplier_id, invoice_type, 
        reverse_charges, invoice_value, taxable_value, gst_rate, sgst_amt, 
        cgst_amt, igst_amt, tds_perc, tds_section, tds_amt, book_type, 
        voucher_no, voucher_date, pending_amount, payment_amt, balance_amt, 
        pay_book_type, pay_voucher_no, pay_voucher_date
    ) VALUES (
        $1, $2+1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
    )
`, [
        bill_id, sr_no, invoice_no, invoice_date, supplier_id, invoice_type,
        reverse_charges, invoice_value, taxable_value, gst_rate, sgst_amt,
        cgst_amt, igst_amt, tds_perc, tds_section, tds_amt, book_type,
        voucher_no, voucher_date, (pendingAmount-paymentAmount), 0, balance_amt ,
        pay_book_type, pay_voucher_no, pay_voucher_date
      ]);
      console.log('Insert successful:', insertVendorBillQuery.rowCount);
    }
  }
      console.log('3')
      const updateJVNoQuery = ` 
              UPDATE cdbm.fin_book_type 
              SET curr_jvno = curr_jvno + 1 
              WHERE fin_year = $1 
                  AND book_type = $2 
                  AND branch_cd = $3 
                  AND cmp_cd = $4 
                  AND exc_cd = $5 
                  AND segment = $6
          `;

      await pool.query(updateJVNoQuery, [finYear, bookType, newBranch_cd,newcmp_cd , newexchange, newsegement]);

      await pool.query('COMMIT');
      res.status(200).send('Voucher(s) inserted successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting voucher:', error);
      res.status(500).send('Error inserting voucher(s). Please try again.');
    }
  });

  module.exports = payment_voucher_router;
