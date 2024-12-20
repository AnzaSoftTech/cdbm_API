const express = require('express');
const finance_report_router = express.Router();
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



finance_report_router.get('/Get_Account_Name', async (req, res) => {
  const { p_Acct_Code } = req.query;

  let query = `SELECT account_name FROM cdbm.fin_account_master WHERE UPPER(act_cd) = UPPER($1);`;

  try {
    const result = await pool.query(query, [p_Acct_Code]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

finance_report_router.get('/day_book', async (req, res) => {
  //const{p_book_types} = req.query;
  const { p_book_types, p_trans_type, p_from_date, p_to_date } = req.query;
 // const { selectedBookTypes, selectedTranTypes, fromDate, toDate} = req.body;

 // console.log(' p_book_types, p_trans_type, p_from_date, p_to_date ',  p_book_types, p_trans_type, p_from_date, p_to_date);

    try {
        const result = await pool.query(`select to_char(trans_date, 'DD-MM-YYYY') trans_date, book_type_desc book_type, ` +
                                         ` voucher_no, account_name, narration, Dr_Amt, Cr_Amt  
                                           from CDBM.VW_DAY_BOOK 
                                          WHERE trans_date between to_date('` + p_from_date + `', 'YYYY-MM-DD') 
                                                       AND to_date('` + p_to_date + `', 'YYYY-MM-DD')
                                            AND book_type in (` + p_book_types + `) ` +
                                          ` AND UPPER(trans_type) in (` + p_trans_type + `)
                                           order by trans_date desc, voucher_no; `);

      res.json(result.rows);

    } catch (err) {
      res.status(500).send(err.message);
      console.log('error in day_book ', err);
    }
  });

  
finance_report_router.get('/ledger_report', async (req, res) => {
  const { p_book_types, p_trans_type, p_from_date, p_to_date, p_acct_cd, p_activity_cd, p_exc_cd, p_segment } = req.query;

  // console.log(' p_from_date, p_to_date, p_acct_cd, p_activity_cd, p_exc_cd, p_segment ',  
  //    p_from_date, p_to_date, p_acct_cd, p_activity_cd, p_exc_cd, p_segment);
     
 //  console.log(' p_acct_cd  ', p_acct_cd);
  // console.log(' p_exc_cd ',  p_exc_cd);
  // console.log('  p_segment ', p_segment);

    try {

		var lv_acct_cd = p_acct_cd;

		if (!p_acct_cd || p_acct_cd === ``)
			lv_acct_cd = null;		   

		await pool.query(`delete from cdbm.ledger_report;`);

        const lv_statement = `insert into cdbm.ledger_report (disp_ord, act_code, account_name, voucher_no, trans_date, book_type, ` +
		                                               ` activity_cd, exc_cd, segment, nor_depos, chq_no, narration, dr_amt, cr_amt) ` +
		                           ` select cast(disp_ord as numeric(4)), act_cd, account_name, voucher_no, trans_date, book_type, activity_cd, ` +
	                                       ` exc_cd, segment, nor_depos, cheque_no, narration, tot_opbal_dr dr_amt, tot_opbal_cr cr_amt ` +
	                                       ` from ( ` +
	                                       ` select '1' disp_ord, coalesce(op_bal.act_cd, c_opbal.act_Cd) act_Cd,  ` +
       	                                       ` coalesce(op_bal.account_name, c_opbal.account_name) account_name, ` +
       	                                       ` '' voucher_no, '' trans_date, '' book_type,  ` +
       	                                       ` coalesce(op_bal.activity_cd, c_opbal.activity_cd) activity_cd,  ` +
       	                                       ` coalesce(op_bal.exc_Cd, c_opbal.exc_Cd) exc_cd,  ` +
       	                                       ` coalesce(op_bal.segment, c_opbal.segment) segment,  ` +
       	                                       ` coalesce(op_bal.nor_depos, c_opbal.nor_depos) nor_depos, ` + 
       	                                       ` '' cheque_no, 'Opening Balance' Narration, ` +
	   	                                       ` case when (coalesce(op_bal.opbal_dr, 0) + coalesce(c_opbal.calc_opbal_dr, 0)) >  ` +
                     	                                       ` (coalesce(op_bal.opbal_cr, 0) + coalesce(c_opbal.calc_opbal_cr, 0)) then ` +
                   	                                       ` (coalesce(op_bal.opbal_dr, 0) + coalesce(c_opbal.calc_opbal_dr, 0)) - ` +
                       	                                       ` (coalesce(op_bal.opbal_cr, 0) + coalesce(c_opbal.calc_opbal_cr, 0)) else 0 end tot_opbal_dr, ` +
	   	                                       ` case when (coalesce(op_bal.opbal_cr, 0) + coalesce(c_opbal.calc_opbal_cr, 0)) >  ` +
                     	                                       ` (coalesce(op_bal.opbal_dr, 0) + coalesce(c_opbal.calc_opbal_dr, 0)) then ` +
                   	                                       ` (coalesce(op_bal.opbal_cr, 0) + coalesce(c_opbal.calc_opbal_cr, 0)) - ` +
                       	                                       ` (coalesce(op_bal.opbal_dr, 0) + coalesce(c_opbal.calc_opbal_dr, 0)) else 0 end tot_opbal_cr ` +
		                                       ` from ( ` +
	                                       ` SELECT ob.act_cd, ob.activity_cd, ob.exc_Cd, ob.segment, nor_depos, am.account_name account_name, ` +
	                                       ` case when drcr = 'Dr' then open_bal_amt else 0 end opbal_dr, ` +
	                                       ` case when drcr = 'Cr' then open_bal_amt else 0 end opbal_cr ` +
	                                       ` FROM cdbm.fin_open_balance ob join ` +
      	                                       ` cdbm.fin_account_master am on am.act_Cd = ob.act_Cd JOIN ` +
	                                       ` (select fin_year ` +
	                                       ` from cdbm.fin_company ` +
	                                       ` where to_date($1, 'yyyy-mm-dd') between fin_yr_frm and fin_yr_to) yr ` +
	                                       ` on yr.fin_year = ob.fin_year ` +
	                                       ` where ob.cb_act_cd is null  ` +
	                                       ` and ob.activity_cd = COALESCE($3, ob.activity_cd) ` +
	                                       ` and ob.exc_cd = COALESCE($4, ob.exc_cd) ` +
	                                       ` and ob.segment = COALESCE($5, ob.segment) ` +
	                                     //  ` and ob.nor_depos = 'N' ` +
	                                      // ` and ob.act_cd = COALESCE($6, ob.act_cd) ` +
	                                       ` and bal_as_on_date <= to_date($1, 'yyyy-mm-dd')) op_bal full outer JOIN ` +
	                                      //  ----- calculated opening balance 
	                                       ` (select ft.act_Cd, book_type, ft.segment, ft.exc_cd, ft.activity_cd, ft.nor_depos, am.account_name account_name, ` +
       	                                       ` SUM(CASE WHEN drcr = 'Dr' THEN amount ELSE 0 END) calc_opbal_dr, ` +
       	                                       ` SUM(CASE WHEN drcr = 'Cr' THEN amount ELSE 0 END) calc_opbal_cr ` +
	                                       ` FROM CDBM.FIN_TRANSACTIONS ft join ` +
   	                                       ` cdbm.fin_account_master am on am.act_Cd = ft.act_Cd join ` +
	                                       ` (select fin_yr_frm, fin_yr_to ` +
	                                       ` from cdbm.fin_company ` +
	                                       ` where to_date($1, 'yyyy-mm-dd') between fin_yr_frm and fin_yr_to) yr ` +
	                                       ` on ft.trans_date between fin_yr_frm and to_date($1, 'yyyy-mm-dd') ` +
	                                       ` where to_date($1, 'yyyy-mm-dd') > fin_yr_frm  ` +
	                                       ` and ft.cb_act_Cd is null ` +
	                                       ` and ft.activity_cd = COALESCE($3, ft.activity_cd) ` +
	                                       ` and ft.exc_cd = COALESCE($4, ft.exc_cd) ` +
	                                       ` and ft.segment = COALESCE($5, ft.segment) ` +
                                         ` and ft.book_type in (` + p_book_types + `) ` +
                                         ` and ft.trans_type in(` + p_trans_type + `) ` +
	                                   //    ` and ft.nor_depos = 'N' ` +
	                                   //    ` and ft.act_cd = COALESCE($6, ft.act_cd) ` +
	                                       ` group by ft.act_Cd, book_type, ft.segment, ft.exc_cd, ft.activity_cd, ft.nor_depos, am.account_name) c_opbal on ` +
	                                       ` op_bal.act_cd = c_opbal.act_cd and  ` +
	                                       ` op_bal.activity_cd = c_opbal.activity_cd and ` +
	                                       ` op_bal.exc_Cd = c_opbal.exc_cd and  ` +
	                                       ` op_bal.segment = c_opbal.segment and ` +
	                                       ` op_bal.nor_depos = c_opbal.nor_depos  ` +
///----- to show transactions
	                                       ` union ` +
	                                       ` select '2' disp_ord, ft.act_Cd, am.account_name, cast(voucher_no as varchar(15)) voucher_no,  ` +
        	                                       ` to_char(trans_date, 'dd-mm-yyyy') trans_date,  ` +
        	                                       ` book_type, ft.activity_cd activity_cd, ft.exc_cd, ft.segment, ft.nor_depos, cheque_no, narration,   ` +
       	                                       ` CASE WHEN drcr = 'Dr' THEN amount ELSE 0 END Dr_Amt, ` +
       	                                       ` CASE WHEN drcr = 'Cr' THEN amount ELSE 0 END Cr_Amt ` +
	                                       ` FROM CDBM.FIN_TRANSACTIONS FT ` +
	                                       ` JOIN cdbm.fin_account_master am on am.act_Cd = ft. act_Cd ` +
	                                       ` where  ` +
 	                                       ` cb_act_Cd is null ` +
	                                       ` and ft.activity_cd = COALESCE($3, ft.activity_cd) ` +
	                                       ` and ft.exc_cd = COALESCE($4, ft.exc_cd) ` +
	                                       ` and ft.segment = COALESCE($5, ft.segment) ` +
                                         ` and ft.book_type in (` + p_book_types + `) ` +
                                         ` and ft.trans_type in(` + p_trans_type + `) ` +
	                                    //   ` and ft.nor_depos = 'N' ` +
	                                     //  ` and ft.act_cd = COALESCE($6, ft.act_cd) ` +
	                                       ` and ft.trans_date between to_date($1, 'yyyy-mm-dd') and to_date($2, 'yyyy-mm-dd') ) ledger ` +
	                                       ` order by 2, 1; `;

    //   console.log('lv_statement => ', lv_statement);

        await pool.query(lv_statement, [p_from_date, p_to_date, p_activity_cd, p_exc_cd, p_segment]); //, lv_acct_cd]); 

        //// inserting opening balance rows where opening balances do not exist.
		await pool.query(`insert into cdbm.ledger_report (disp_ord, act_code, account_name, narration, dr_amt, cr_amt)
                            select distinct 1 disp_ord, act_code, account_name, 'Opening Balance', 0, 0
                          from cdbm.ledger_report where act_code not in (select distinct act_code from cdbm.ledger_report where disp_ord = 1);`);

        //// setting account_name to null to avoid redundant occurrances.
	    await pool.query(`update cdbm.ledger_report set account_name = null where disp_ord = '2';`);

		/// Totalling Debit and Credit Columns
		await pool.query(`insert into cdbm.ledger_report (disp_ord, act_code, narration, dr_amt, cr_amt)
                              select 5 disp_ord , act_code, 'Total Amount' narration, sum(dr_amt), sum(cr_amt)
                                from cdbm.ledger_report
                               group by act_code;`);

		/// Calculating Closing Balance
		await pool.query(`insert into cdbm.ledger_report (disp_ord, act_code, narration, dr_amt, cr_amt)
                           select 7 disp_ord , act_code, 'Closing Balance' narration, 
                                 case when coalesce(dr_amt, 0) > coalesce(cr_amt, 0) then coalesce(dr_amt, 0) - coalesce(cr_amt, 0)  end dr_amt,
                                 case when coalesce(cr_amt, 0) > coalesce(dr_amt, 0) then coalesce(cr_amt, 0) - coalesce(dr_amt, 0)  end cr_amt
                            from cdbm.ledger_report where disp_ord = 5;`);

		/// inserting empty rows after every Closing Balance
		await pool.query(`insert into cdbm.ledger_report (disp_ord, act_code)
                            select distinct 9 disp_ord, act_code from cdbm.ledger_report 
                           where disp_ord = 7;`);

		const result = await pool.query(`select disp_ord, act_code, account_name, voucher_no, trans_date, book_type, activity_cd, exc_cd, segment, nor_depos, 
                           chq_no cheque_no, narration, dr_amt, cr_amt, closing_bal
                          from cdbm.ledger_report order by act_code, disp_ord;`);

		// const result = await pool.query(`select act_code, account_name, voucher_no, trans_date,  
		// 	chq_no cheque_no, '"' || narration || '"' narration, dr_amt, cr_amt, closing_bal
		//    from cdbm.ledger_report order by act_code, disp_ord;`);

     // console.log('ledger_report => result.rows ', result.rows);

      res.json(result.rows);

    } catch (err) {
      res.status(500).send(err.message);
      console.log('error in ledger_report ', err);
    }
  });

module.exports = finance_report_router;
