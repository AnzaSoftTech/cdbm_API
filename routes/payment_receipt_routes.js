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

    let query = `SELECT cb_act_cd, bank_name || ' ' || coalesce(bank_acc_no, '') bank_ac_name ` +
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
   // console.log('p_cb_act_cd --> ', p_cb_act_cd);
    const result = await pool.query(`SELECT activity_cd, segment, book_type FROM cdbm.fin_cash_bank_master where cb_act_cd = '` +
      p_cb_act_cd + `'`);
    //console.log('populatedetails result.rows ==> ', result.rows);
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
    const result = await pool.query('SELECT act_cd, account_name FROM cdbm.fin_account_master order by account_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

payment_voucher_router.get('/searchAccount', async (req, res) => {
  const { activity_cd, segment, name } = req.query;
  //console.log('body',req.body);
  let queryParams = [];
  let query = 'SELECT act_cd, account_name FROM cdbm.fin_account_master WHERE 1=1 ';

  //console.log('activity_cd, segment --> ', activity_cd, segment);

  if (activity_cd) {
    query += ' AND activity_cd = $1';
    queryParams.push(activity_cd);
  }
  if (segment) {
    query += ' AND segment = $2';
    queryParams.push(segment);
  }
  if (name) {
    query += ' AND account_name ILIKE $3';
    queryParams.push(`%${name}%`);
  }

  // console.log('query -> ', query);
  // console.log('queryParams -> ', queryParams);

  try {
    const result = await pool.query(query, queryParams);
    //console.log('result --> ', result);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

payment_voucher_router.get('/searchVouchers', async (req, res) => {
  const { voucherNo, branchNamecd, bookType, fromDate, toDate, accountName,TransactionType } = req.query;
 // console.log('Received query parameters-------:', req.query);

  
  // let query = `SELECT ft.segment, ft.exc_cd, ft.nor_depos, ft.fin_year, ft.branch_cd, ft.cmp_cd, ` +
  //   ` ft.voucher_no,ft.book_type, ft.trans_date, fm.account_name,fm.act_cd ,ft.amount, ft.drcr ,ft.trans_type ` +
  //   ` FROM cdbm.fin_transactions ft join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd and fm.branch_cd = ft.branch_cd  and ft.trans_type=ft.trans_type WHERE 1=1`;

  /// ft.exc_cd,  ft.branch_cd, ft.cmp_cd, and fm.branch_cd = ft.branch_cd 

  let query = ` SELECT ft.segment, ft.nor_depos, ft.fin_year, ft.voucher_no voucher_no, ft.book_type book_type, ft.trans_date trans_date, fm.account_name act_name,
         fm.act_cd ,ft.amount, ft.drcr ,ft.trans_type FROM cdbm.fin_transactions ft 
     join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd 
	WHERE ft.trans_type = '` +  TransactionType + `'` +
 ` union
SELECT ft.segment, ft.nor_depos, ft.fin_year, 
     ft.voucher_no,ft.book_type, ft.trans_date, cbm.account_title, cbm.cb_act_cd ,ft.amount, ft.drcr ,ft.trans_type 
  FROM cdbm.fin_transactions ft 
     join cdbm.fin_cash_bank_master cbm on cbm.cb_act_Cd = ft.cb_act_cd  
	WHERE ft.trans_type = '` + TransactionType + `'`;


  //console.log('query --> ', query);

  if (accountName) {
    query += ` AND fm.account_name ilike  '%` + accountName + `%'`;
  }
 
  // if (branchNamecd) {
  //   query += ` AND ft.branch_cd = '` + branchNamecd + `'`;
  // }

  if (fromDate && toDate) {
    query += ` and to_date(to_char(ft.trans_date, 'YYYY/MM/DD'), 'YYYY/MM/DD') ` +
      ` between to_date('` + fromDate + `', 'YYYY/MM/DD') and ` +
      `      to_date('` + toDate + `', 'YYYY/MM/DD')`
  }


  // if (bookType) {
  //   query += ` AND book_type = '` + bookType + `'`;
    
  // }

  if (bookType) {
    query += ` AND book_type = '` + bookType + `'`;
    
  }
  query += ` order by trans_date desc, voucher_no, book_type `;
//console.log('query -> ', query);
  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query:', err.message);
    res.status(500).send('Server error');
  }
});


payment_voucher_router.get('/searchVoucharById', async (req, res) => {
  const { fin_year, voucherNo, bookType, tranType} = req.query;
 // console.log('Received query parameters:', req.query);

  // ft.branch_cd, ft.cmp_cd,
  let lv_hdr_query = ` SELECT ft.segment, ft.activity_cd, ft.nor_depos, ft.fin_year,  ` +
  `ft.voucher_no, ft.book_type, (ft.trans_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS trans_date,ft.amount, ft.drcr, ` +
   `ft.narration,(ft.eff_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS eff_date,ft.narr_code, ft.cb_act_cd, ` +
   ` ft.d_add_date, ft.trans_type,ft.nse_narr_code,
          ft.cheque_no, ft.payer_payee, ft.payment_mode, ft.reference_no ` +
  ` FROM cdbm.fin_transactions ft  ` +
  ` WHERE voucher_no = ` + voucherNo +
  ` AND fin_year = ` + fin_year +
   ` AND ft.book_type = '` + bookType + `'` +
  ` AND ft.trans_type = '` + tranType + `'` +
  ` AND ft.book_type = '` + bookType  + `'` +
  ` and ft.act_cd is null  `  ;
  
  // ft.branch_cd, ft.cmp_cd,
  
  let lv_dtl_query = ` SELECT ft.segment, ft.activity_cd, ft.nor_depos, ft.fin_year,  ft.nse_narr_code,` +
    `           ft.voucher_no, ft.book_type, (ft.trans_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS trans_date,ft.amount, ft.drcr, ft.narration, ` +
    `           (ft.eff_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS eff_date,ft.narr_code,ft.act_cd,fm.account_name act_name,ft.d_add_date ,ft.trans_type` +
    `   FROM cdbm.fin_transactions ft join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd  ` +
    `        and fm.segment = ft.segment` +
    ` WHERE voucher_no = ` + voucherNo +
    ` AND fin_year = ` + fin_year +
   ` AND ft.trans_type = '` + tranType + `'` +
   ` AND ft.book_type = '` + bookType  + `'` +
   ` and ft.cb_act_cd is null  ` ;

   // and fm.nor_depos = ft.nor_depos

  try {
   // console.log('Final query:', lv_dtl_query);
    
    const result = await pool.query(lv_dtl_query);
    const hdr_result = await pool.query(lv_hdr_query);

    const hdrrows = hdr_result.rows;
    const dtlrows = result.rows;

    res.json({
      headerData: hdrrows,
      detailData: dtlrows
  });

  //  res.json(result.rows);

    //console.log('Query result:', result.rows);
  } catch (err) {
    console.error('Error executing query:', err.message);
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

payment_voucher_router.get('/get_segment', async (req, res) => {
  try {
    const result = await pool.query('SELECT seg_code seg_code, seg_name seg_name FROM cdbm.segment_master order by seg_code;');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

payment_voucher_router.get('/get_activity_cd', async (req, res) => {
  try {
    const result = await pool.query('SELECT activity_cd activity_cd, act_name act_name FROM cdbm.activity_master order by activity_cd;');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

payment_voucher_router.get('/bill_master', async (req, res) => {
  try {
    //console.log('1');

    // Extract 'act_cd' from query parameters
    const { actCd } = req.query;
    //console.log('actCd:', actCd);

    // Convert actCd to an array if it's not already
    const actCdArray = Array.isArray(actCd) ? actCd : [actCd];
   // console.log('actCdArray:', actCdArray);

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

    //console.log('2');
    //console.log('result', result.rows)
    return res.json(result.rows);

  } catch (err) {
    console.log('error in VENDOR_BILLS ==== ', err);
    res.status(500).json({ error: err.message });
  }
});

// below function is called during edit save
payment_voucher_router.post('/voucher_edit', async (req, res) => {
  const { header, details, vendorDetails } = req.body;
  //const { bookType, voucherDate, effectiveDate, TransactionType, userId } = header;
  const {cbaccount,
    fin_year,
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
    segment,
    userId,
    TransactionType} = header;

    try {
      await pool.query('BEGIN');

      var header_dr_cr = "";

    if (TransactionType === "Payment")
    {
        header_dr_cr = "Cr"
    }
    else {
        header_dr_cr = 'Dr'
    }

    // const insertQueryheader = `
    // INSERT INTO cdbm.fin_tran_temp 
    //     (book_type, trans_date, eff_date, cb_act_cd, amount, drcr, segment, exc_cd, nor_depos, 
    //       narration, fin_year, branch_cd, cmp_cd, voucher_no, narr_code, trans_type, n_add_user_id, nse_narr_code, 
    //       cheque_no, payer_payee, payment_mode, ref_no, d_add_date)
    // VALUES 
    //     ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
    //     $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, clock_timestamp())`;

    await pool.query(`delete from cdbm.fin_tran_temp where n_upd_user_id = ` + userId);

    const upd_Hdr_Query = `update cdbm.fin_transactions ` +
                          ` set  trans_date = to_date($1, 'YYYY-MM-DD') ` + 
                          `   ,    eff_date = to_date($2, 'YYYY-MM-DD') ` + 
                          `   ,     amount  = $3 ` +  
                          `   ,   narration = $4 ` + 
                          `   ,   narr_code = $5 ` + 
                          `  , nse_narr_code = $6 ` + 
                          `  ,     cheque_no = $7 ` + 
                          `  ,  payer_payee  = $8 ` + 
                          `  ,  payment_mode = $9 ` + 
                          `  ,  reference_no = $10 ` + 
                          `  ,  n_upd_user_id = $11 ` +
                          `  ,  d_upd_date = clock_timestamp() ` +
                          `  where fin_year = $12 ` + 
                          `    and book_type = $13 ` +
                          `    and voucher_no =  $14 ` +
                          `    and segment = $15 ` +
                          `    and act_cd is null; `;
                        //  `    and cmp_cd = $15` +
                        //  `    and exc_cd = $16` +
                         // `    and branch_cd = $18` ;

      //console.log('voucher_edit ---> 2 upd_Hdr_Query', upd_Hdr_Query);

      await pool.query(upd_Hdr_Query, [ voucherDate, effectiveDate, amount, narration, analyzerCode, nsebankanalyzerCode, 
                                        chequeNo, payeeName, paymentMode, refNo, userId, fin_year, bookType, voucherNo, segment]);
                  
      // branch_cd, cmp_cd, exc_cd,

      const tmp_insertQuery = `
               INSERT INTO cdbm.fin_tran_temp
                     (fin_year, voucher_no, book_type, segment, act_cd, nor_depos,
                      trans_type, trans_date, eff_date, cheque_no, amount, payer_payee, activity_cd, 
                      drcr, narration, narr_code, nse_narr_code, n_upd_user_id, d_upd_date)
               VALUES 
                   ($1, $2, $3, $4, $5, $6, $7, to_date($8, 'YYYY-MM-DD'), to_date($9, 'YYYY-MM-DD'),` +
                   ` $10, $11, $12, $13, $14, $15, $16, $17, $18, clock_timestamp())`;

      for (let detail of details) {
        const { fin_year, dr_amount, cr_amount, dr_cr, segment, activity_cd, noraml_deposit, narration, act_cd, 
                branch_cd, cmp_cd, analyzer_code, nse_clnt_analyzer_code } = detail;
        let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;
        //console.log('voucher_edit ---> 4  '); branch_cd, cmp_cd, exchange,  
        await pool.query(tmp_insertQuery, [fin_year, voucherNo, bookType, segment, act_cd, noraml_deposit,TransactionType, voucherDate,
                                           effectiveDate, chequeNo, amount, payeeName, activity_cd, dr_cr, narration, 
                                           analyzer_code, nse_clnt_analyzer_code, userId]);
      }

      const del_Query = `delete from cdbm.fin_transactions ` +
                          `  where fin_year = $1` + 
                          `    and book_type = $2` +
                          `    and voucher_no =  $3` +
                          `    and cb_act_cd is null  ` +
                          `  and act_cd not in (select act_cd from cdbm.fin_tran_temp) `;

      //console.log('voucher_edit ---> 5 del_Query ', del_Query);

      await pool.query(del_Query, [fin_year, bookType, voucherNo]);

      const upd_Dtl_Query = `update cdbm.fin_transactions ft ` +
                      ` set  trans_date = to_date($1, 'YYYY-MM-DD') ` +
                      `   ,    eff_date = to_date($2, 'YYYY-MM-DD') ` +
                      `  ,  n_upd_user_id = tmp.n_upd_user_id` +
                      `   ,     amount  = tmp.amount` +
                      `   ,   narration = tmp.narration` +
                      `   ,   narr_code = tmp.narr_code` +
                      `  , nse_narr_code = tmp.nse_narr_code` +
                      `  ,      nor_depos = tmp.nor_depos ` +
                      `  ,  d_upd_date = clock_timestamp() ` +
                      ` from (select fin_year, voucher_no, book_type, segment, act_cd, activity_cd, nor_depos, ` +
                      `              trans_type, trans_date, eff_date, cheque_no, amount, payer_payee, ` +
                      `              drcr, narration, narr_code, nse_narr_code , n_upd_user_id ` +
                      `          from cdbm.fin_tran_temp) tmp ` +
                      `  where ft.fin_year = tmp.fin_year ` +
                      `    and ft.book_type = tmp.book_type ` +
                      `    and ft.voucher_no =  tmp.voucher_no ` +
                      `    and ft.segment = tmp.segment ` +
                      `    and ft.cmp_cd = tmp.activity_cd ` +
                      `    and ft.act_cd = tmp.act_cd; `;  

   //console.log('voucher_edit ---> 6 upd_Dtl_Query ', upd_Dtl_Query);

      await pool.query(upd_Dtl_Query, [voucherDate, effectiveDate]);

      await pool.query(`DELETE FROM cdbm.fin_tran_temp tmp using cdbm.fin_transactions ft
                         where ft.fin_year = tmp.fin_year
                          and ft.book_type = tmp.book_type
                          and ft.voucher_no =  tmp.voucher_no
                          and ft.segment = tmp.segment
                          and ft.act_cd = tmp.act_cd`) ;  

      const ins_Dtl_Query = `INSERT INTO cdbm.fin_transactions 
                     (fin_year, voucher_no, book_type, cmp_cd, segment, act_cd, nor_depos,
                      trans_type, trans_date, eff_date, cheque_no, amount, payer_payee,
                      drcr, narration, narr_code, nse_narr_code, n_add_user_id, d_add_date) ` +
                 `  select tmp.fin_year, tmp.voucher_no, tmp.book_type, tmp.activity_cd, tmp.segment, tmp.act_cd, tmp.nor_depos,
                      tmp.trans_type, tmp.trans_date, tmp.eff_date, tmp.cheque_no, tmp.amount, tmp.payer_payee,
                      tmp.drcr, tmp.narration, tmp.narr_code, tmp.nse_narr_code, tmp.n_upd_user_id, tmp.d_upd_date ` +
                  ` from cdbm.fin_tran_temp tmp ` +
                  ` where tmp.book_type = $1` + 
                  `  and  tmp.voucher_no = $2` ;

     // console.log('voucher_edit ---> 6 ins_Dtl_Query ', ins_Dtl_Query);

      await pool.query(ins_Dtl_Query, [bookType, voucherNo]);


       // console.log('voucher_edit ---> 7');

        // await pool.query(`delete from cdbm.fin_tran_temp`);

        await pool.query('COMMIT');
        res.status(200).send('Voucher(s) updated successfully');
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting voucher:', error);
        res.status(500).send('Error inserting voucher(s). Please try again.');
      }


});


payment_voucher_router.post('/save_payment_voucher', async (req, res) => {
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
    segment,
    hdractivitycode,
    userId,
    TransactionType} = header;


  //console.log('req.body ====> ', req.body);

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
   // console.log("Parameters for jvnoQuery:", finYear, bookType, newBranch_cd,newcmp_cd, newexchange, newsegement);

    const jvnoQuery = `SELECT jv_no FROM cdbm.fin_book_type 
                       WHERE fin_year = $1
                         AND book_type = $2 
                         AND activity_code = $3 
                         AND seg_code = $4`;

    //console.log('finYear, bookType, hdractivitycode, segment ---> ', finYear, bookType, hdractivitycode, segment);

    const jvnoResult = await pool.query(jvnoQuery, [finYear, bookType, hdractivitycode, segment]);
    if (jvnoResult.rows.length === 0) {
      throw new Error('JV number not found for the provided criteria');
    }
    const currentJVNo = jvnoResult.rows[0].jv_no;
/*
    const cash_bank_dtls = `select branch_cd, cmp_cd, exc_cd, segment from cdbm.fin_cash_bank_master ` +
                           ` where cb_act_cd = '` + cbaccount + `'`;

    const cb_result = await pool.query(cash_bank_dtls);
*/
    //const hdr_branch_cd = cb_result.rows[0].branch_cd;
    //const hdr_exc_cd = cb_result.rows[0].exc_cd;
    //const hdr_cmp_Cd = cb_result.rows[0].cmp_cd;
    //const hdr_segment = cb_result.rows[0].segment;
    const hdr_nor_dep = "N";

    const insertQueryheader = `
    INSERT INTO cdbm.fin_transactions 
        (book_type, trans_date, eff_date, cb_act_cd, amount, drcr, segment, activity_cd, nor_depos, 
          narration, fin_year, voucher_no, narr_code, trans_type, n_add_user_id, nse_narr_code, 
          cheque_no, payer_payee, payment_mode, reference_no, d_add_date)
    VALUES 
        ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, clock_timestamp())`;

        var header_dr_cr = "";

    if (TransactionType === "Payment")
    {
        header_dr_cr = "Cr"
    }
    else {
        header_dr_cr = 'Dr'
    }

    await pool.query(insertQueryheader, [bookType, voucherDate, effectiveDate, cbaccount, amount, header_dr_cr, segment, 
                     hdractivitycode, hdr_nor_dep, narration, finYear, currentJVNo, analyzerCode, TransactionType, userId, 
                    nsebankanalyzerCode, chequeNo, payeeName, paymentMode, refNo]);

     const insertQuery = `
            INSERT INTO cdbm.fin_transactions 
                (book_type, trans_date, eff_date, act_cd, amount, drcr, segment, activity_cd, nor_depos, 
                  narration, fin_year, voucher_no, narr_code, trans_type, n_add_user_id, nse_narr_code,
                  cheque_no, payer_payee, payment_mode, reference_no, d_add_date)
            VALUES 
                ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
                $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                 $19, $20, clock_timestamp())`;

    for (let detail of details) {
      const { act_name, dr_amount, cr_amount, dr_cr, segment, activity_cd, noraml_deposit, narration,
              act_cd, branch_cd, cmp_cd,analyzer_code, nse_clnt_analyzer_code } = detail;
      let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;
 
          //console.log('insertQuery ==> ', insertQuery);
      await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, act_cd, amount, dr_cr, segment, activity_cd, noraml_deposit,
                       narration, finYear, currentJVNo, analyzer_code, TransactionType, userId,  nse_clnt_analyzer_code,
                       chequeNo, payeeName, paymentMode, refNo]);
    }
    
    for (let vendorDetail of vendorDetails) {
      const { bill_id, sr_no, invoice_no, invoice_date, supplier_id, invoice_type,
        reverse_charges, invoice_value, taxable_value, gst_rate, sgst_amt,
        cgst_amt, igst_amt, tds_perc, tds_section, tds_amt, book_type,
        voucher_no, voucher_date, pending_amount, payment_amt, balance_amt,
        pay_book_type, pay_voucher_no, pay_voucher_date } = vendorDetail;
      // console.log('bill_id', bill_id);
      // console.log('invoice_no', invoice_no);
      // console.log('payment_amt', payment_amt);
      // console.log('pending_amt', pending_amount);
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

      const updateJVNoQuery = ` 
              UPDATE cdbm.fin_book_type 
              SET jv_no = jv_no + 1 
              WHERE fin_year = $1 
                  AND book_type = $2 
                  AND activity_code = $3
                  AND seg_code = $4`;

      await pool.query(updateJVNoQuery, [finYear, bookType, hdractivitycode, segment]);

      await pool.query('COMMIT');
      res.json({message: currentJVNo });
      //res.status(200).send('Voucher(s) inserted successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting voucher:', error);
      //res.json({message: '-1' });
      res.status(500).send('Error inserting payment voucher. Please try again.');
    }
  });

  module.exports = payment_voucher_router;
