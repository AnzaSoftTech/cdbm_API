const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const cashbank_router = express.Router();
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


cashbank_router.get('/ddl_segment_master', async (req, res) => {
    try {
  
      let query = `SELECT seg_code, seg_name ` +
                 ` FROM cdbm.segment_master order by seg_code; ` ;
  
        const result = await pool.query(query);
        res.json(result.rows);
  
    } catch (error) {
        //logError(error, req);
        console.log('ddl_segment_master error :', error);
        res.status(500).send(error.message);
    }
  });
  
  cashbank_router.get('/ddl_activity_master', async (req, res) => {
    try {
  
      const {p_segment_cd} = req.query;
  
      let query = `SELECT activity_cd, act_name  ` +
                 ` FROM cdbm.activity_master ` + 
                 ` WHERE seg_code = '` + p_segment_cd + `'`+
                 ` order by activity_cd; ` ;
  
        const result = await pool.query(query);
        res.json(result.rows);
  
    } catch (error) {
        console.log('error  >>>>>', error);
      //  logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
  cashbank_router.get('/ddl_fin_group_level2', async (req, res) => {
    try {
      
      let query = `SELECT grp_cd_lvl2, grp_desc ` +
                 ` FROM cdbm.fin_group_level2 order by grp_desc; ` ;
  
        const result = await pool.query(query);
        res.json(result.rows);
  
    } catch (error) {
      //  logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
  cashbank_router.get('/ddl_fin_group_level3', async (req, res) => {
    try {
  
      const {p_grp_lvl2} = req.query;
  
     // console.log('p_grp_lvl2 ==> ', p_grp_lvl2);
  
      let query = `SELECT grp_cd_lvl3, grp_desc ` +
                 ` FROM cdbm.fin_group_level3 ` + 
                 ` WHERE grp_cd_lvl2 = ` + p_grp_lvl2 +
                 ` ORDER BY grp_desc; ` ;
  
        const result = await pool.query(query);
  
        res.json(result.rows);
  
    } catch (error) {
        //logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
  cashbank_router.get('/ddl_fin_group_level4', async (req, res) => {
    try {
  
      const {p_grp_lvl3} = req.query;
  
      // console.log('p_grp_lvl3 => ', p_grp_lvl3);
  
      let query = `SELECT grp_cd_lvl4, grp_desc ` +
                 ` FROM cdbm.fin_group_level4 ` + 
                 ` WHERE grp_cd_lvl3 = ` + p_grp_lvl3 +
                 ` ORDER BY grp_desc; ` ;
  
        const result = await pool.query(query);
        res.json(result.rows);
  
    } catch (error) {
       // logError(error, req);
       // console.log('error ==> ', error);
        res.status(500).send(error.message);
    }
  });
  
  cashbank_router.get('/ddl_MI_master', async (req, res) => {
    try {
 
      let query = `SELECT MII_Id exc_Cd, MII_Name exc_Name ` +
                 ` FROM cdbm.MII_Master ` + 
                 ` WHERE MII_CATG = 'EXC'`;
  
        const result = await pool.query(query);
        res.json(result.rows);
  
    } catch (error) {
        // logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
  
  cashbank_router.post('/save_cash_bank_master', async (req, res) => {
    const { header } = req.body;
    const { cbAcctCode, acctType, actstatus, acctTitle, activityCode, exchange, segment, bookType, 
            groupCode, subgroupCode, subsubgroupCode, fromDate, 
            toDate, bankName, acctNo, bankBranchCode, acctCatg, ifscCode, micr, pan, gstNo, excClearNo, userId } = header;
  
    //console.log('req.body ====> ', req.body);
  
    try {
      await pool.query('BEGIN');
      
      console.log('cbAcctCode ====> ', cbAcctCode);
  
      if (!cbAcctCode)
      {
        const max_result = await pool.query(`SELECT max(cast(substring(cb_act_cd, 4) as numeric(4))) max_no 
            FROM cdbm.fin_cash_bank_master;`);
        var lv_max_no = max_result.rows[0].max_no;
        if (lv_max_no === 0) {
          lv_max_no = 1;
        }
        else {
          lv_max_no++;
        }
        console.log('bankBranchCode',bankBranchCode);
        const lv_cb_act_cd = 'CBB0' + lv_max_no;
        const lv_ins_statement = `Insert into cdbm.fin_cash_bank_master (
                                        cb_act_cd, activity_cd, exc_cd, segment, book_type, account_title, bank_name,
                                        bank_acc_no, act_type, act_catg, bank_branch_cd, grp_code, sub_grp_code, sub_sub_grp_code,
                                         ifsc, micr, pan, gst_no, act_start_date, act_end_date, status, exc_clearing_no, 
                                        add_user_id, add_date)
                                  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, clock_timestamp());`;
        //console.log('lv_ins_statement ====> ', lv_ins_statement);
        await pool.query(lv_ins_statement, [lv_cb_act_cd, activityCode, exchange, segment, bookType, acctTitle, bankName, 
                                     acctNo, acctType,  acctCatg, bankBranchCode||null, groupCode, subgroupCode, subsubgroupCode, 
                                     ifscCode, micr, pan, gstNo, fromDate, toDate, actstatus,  excClearNo, userId ]);
      }
      else 
      {
       // lv_max_no = cbAcctCode;
        lv_upd_statement = `update cdbm.fin_cash_bank_master 
                              set activity_cd = $1,
                                 exc_cd = $2, segment = $3, book_type = $4, account_title = $5, bank_name = $6,
          bank_acc_no = $7, act_type = $8, act_catg = $9, bank_branch_cd = $10, grp_code = $11, sub_grp_code = $12, 
          sub_sub_grp_code = $13, ifsc = $14, micr = $15, pan = $16, gst_no = $17, act_start_date = $18, act_end_date = $19, status = $20, exc_clearing_no = $21,
          upd_user_id = $22, upd_date = clock_timestamp()
          where cb_act_cd = $23;`;
          await pool.query(lv_upd_statement, [activityCode, exchange, segment, bookType, acctTitle, bankName, 
            acctNo, acctType,  acctCatg, bankBranchCode, groupCode, subgroupCode, subsubgroupCode, 
            ifscCode, micr, pan, gstNo, fromDate, toDate || null, actstatus,  excClearNo, userId, cbAcctCode ]);
      }
  
      await pool.query('COMMIT');
      //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
      res.json({message: '' });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting voucher:', error);
      res.status(500).send('Error inserting voucher(s). Please try again.');
    }
  });
  
  cashbank_router.get('/search_bookType_frm_cash_bank_master', async (req, res) => {
    const { bookType } = req.query;
    console.log('body',req.body);
    // let queryParams = [];
    let query = `SELECT DISTINCT book_type FROM cdbm.fin_cash_bank_master 
                 WHERE UPPER(book_type) LIKE UPPER('%` + bookType + `%');`;
    try {
      //const result = await pool.query(query, queryParams);
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
  cashbank_router.get('/search_BankBranches', async (req, res) => {
    const { branchname, bankname, addr1 } = req.query;
    console.log('body',req.body);
    let queryParams = [];
    let query = `SELECT addr_id, branch_name, addr_for bank_name, addr_line1 FROM cdbm.address_master WHERE addr_type='BANK'`;
  
    query += ` AND UPPER(branch_name) LIKE UPPER('%` + branchname + `%')`;
    query += ` AND UPPER(addr_for) LIKE UPPER('%` + bankname + `%')`;
    query += ` AND UPPER(addr_line1) LIKE UPPER('%` + addr1 + `%')`;
    
    // if (branchname) {
    //   query += ` AND branch_name ILIKE $1`;
    //   queryParams.push(`%${branchname}%`);
    // }
  
    try {
      //const result = await pool.query(query, queryParams);
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
  
  cashbank_router.post('/save_cheque_nos', async (req, res) => {
    const { header, details } = req.body;
    const { p_cbAcctCode, userId } = header;
  
    //console.log('req.body ====> ', req.body);
  
    try {
      await pool.query('BEGIN');
  
      const max_result = await pool.query(`SELECT coalesce(max(chq_id), 0) + 1  max_no FROM cdbm.fin_cheque_no;`);
      var lv_chq_no = max_result.rows[0].max_no;
  
      var lv_statement = '';
      for (let detail of details) {
        const { chq_id, from_chq_no, to_chq_no } = detail;
        if (!chq_id)
          {
            lv_statement = `Insert into cdbm.fin_cheque_no (chq_id, cb_act_cd, from_chq_no, to_chq_no, add_user_id, add_date) ` +
                                      `values ($1, $2, $3, $4, $5, clock_timestamp());`;
           await pool.query(lv_statement, [lv_chq_no, p_cbAcctCode, from_chq_no, to_chq_no, userId ]);
           lv_chq_no++;
          }
          else {
            lv_statement = `update cdbm.fin_cheque_no ` +
                          `   set from_chq_no = $1, to_chq_no = $2, upd_user_id = $3, upd_date = clock_timestamp() ` +
                          ` where chq_id = $4 and cb_act_cd = $5 and (from_chq_no != $1 or to_chq_no != $2) `;
            await pool.query(lv_statement, [from_chq_no, to_chq_no, userId, chq_id, p_cbAcctCode ]);
          }
                  
      } // end of for loop
  
      await pool.query('COMMIT');
      //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
      res.json({message: lv_chq_no });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting Cheque:', error);
      res.status(500).send('Error inserting Cheque no(s). Please try again.');
    }
  });
  
  cashbank_router.get('/get_cheque_nos', async(req,res)=>{
  
  const { p_cbAcctCode } = req.query;
  
    let query = `SELECT chq_id, from_chq_no, to_chq_no ` +
                ` FROM cdbm.fin_cheque_no where cb_act_cd = '` + p_cbAcctCode + `';`; 
  
    try {
      const result = await pool.query(query);
      res.json(result.rows);
      console.log('Cheque result:', result.rows);
    } catch (err) {
      console.error('Error executing cheque query:', err.message);
      res.status(500).send('Server error');
    }
  });
  
  cashbank_router.get('/search_Cash_Bank_Master', async (req, res) => {
    const { p_acct_title, p_bank_name, p_acct_no } = req.query;
    
    let query = `SELECT account_title acct_title, bank_name, bank_acc_no acct_no, cb_act_cd ` +
      ` FROM cdbm.fin_cash_bank_master WHERE UPPER(account_title) like UPPER('%` + p_acct_title + `%') ` +
      `  and UPPER(bank_name) like UPPER('%` + p_bank_name + `%') and bank_acc_no like '%` + p_acct_no + `%';`;
  
     // console.log('query ==>', query);
    try {
      //console.log('Final query:', query);
      const result = await pool.query(query);
      res.json(result.rows);
     // console.log('Query result:', result.rows);
    } catch (err) {
      console.error('Error executing query:', err.message);
      res.status(500).send('Server error');
    }
  });
  
  cashbank_router.get('/search_CashBank_Master_ById', async (req, res) => {
    const { p_cb_act_cd} = req.query;
    
    let query = `SELECT cb_act_cd, account_title, bank_name, bank_acc_no acct_no, activity_cd, exc_cd, segment, ` +
                `        book_type,  act_type, act_catg, bank_branch_cd, grp_code, sub_grp_code, sub_sub_grp_code, ifsc, ` +
                `        cbm.micr micr, act_start_date, act_end_date, cbm.status status, exc_clearing_no, bal_drcr, ` +
                `        am.branch_name branch_name, cbm.pan pan, cbm.gst_no gst_no ` +
                `  FROM cdbm.fin_cash_bank_master cbm ` + 
                `  LEFT JOIN cdbm.address_master am ON am.addr_id = cbm.bank_branch_cd ` +
                ` WHERE cb_act_cd = '`  + p_cb_act_cd + `';`;
  
    try {
      //console.log('search by Id query:--->', query);
      const result = await pool.query(query);
      res.json(result.rows);
     console.log('Query result:', result.rows);
    } catch (err) {
      console.error('Error executing query:--->', err.message);
      res.status(500).send('Server error');
    }
  });
  
  
  cashbank_router.get('/get_addresses', async (req, res) => {
    const { p_addr_type } = req.query;
    
    let query = `SELECT addr_id, addr_type, addr_for, branch_name, micr, addr_line1, addr_line2, addr_line3, ` +
                       ` city, pin, phone1, phone2, phone3, email_id, website, status ` +
      ` FROM cdbm.address_master WHERE UPPER(addr_type) = UPPER('` + p_addr_type + `');`;
  
     // console.log('query ==>', query);
    try {
      //console.log('Final query:', query);
      const result = await pool.query(query);
      res.json(result.rows);
     // console.log('Query result:', result.rows);
    } catch (err) {
      console.error('Error executing query:', err.message);
      res.status(500).send('Server error');
    }
  });
  
  cashbank_router.get('/get_cont_persons', async (req, res) => {
    const { p_addr_id } = req.query;
    
    let query = `SELECT cont_pers_id, addr_id, cont_pers_name, designation, dept, email_id1, email_id2, mobile, phone, extn, status ` +
      ` FROM cdbm.cont_person_master WHERE addr_id = ` + p_addr_id + `;`;
    try {
      const result = await pool.query(query);
      //console.log('Final result > :', result);
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query:', err.message);
      res.status(500).send('Server error');
    }
  });
  
  cashbank_router.post('/save_address_cont_persons', async (req, res) => {
    const { header, details } = req.body;
    //const { header} = req.body;
    const { addrId, branchname, addrfor, addrLine1, addrLine2, addrLine3, city, pin, phone1, phone2, phone3,
            email, website, addrstatus, addrtype, userId } = header;
  
    //console.log('req.body ====> ', req.body);
  
    try {
      await pool.query('BEGIN');
  
      
      var lv_statement = '';
      var lv_cont_person_inst_up = '';
      var lv_cont_pers_id = 0;
  
      if (!addrId)
      {
        const max_result = await pool.query(`SELECT coalesce(max(addr_id), 0) + 1  max_no FROM cdbm.address_master;`);
        var lv_addr_id = max_result.rows[0].max_no;
        lv_statement = `Insert into cdbm.address_master (addr_id, addr_type, addr_for, branch_name, addr_line1, addr_line2, addr_line3, ` +
                                                        ` city, pin, phone1, phone2, phone3, email_id, website, status, add_user_id, add_date) ` +
                                                ` values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, clock_timestamp());`;
        await pool.query(lv_statement, [lv_addr_id, addrtype, addrfor, branchname, addrLine1, addrLine2, addrLine3, 
                                        city, pin, phone1, phone2, phone3, email, website, addrstatus, userId ]);
      }
      else {
        lv_addr_id = addrId;
        console.log('in address update addrId -> ', addrId);
        lv_statement = `Update cdbm.address_master ` +
                       ` set addr_for = $1, branch_name = $2, addr_line1 = $3, addr_line2 = $4, addr_line3 = $5, ` +
                          `  city = $6, pin = $7, phone1 = $8, phone2 = $9, phone3 = $10, email_id = $11, website = $12,` +
                          `  status = $13, upd_user_id = $14, upd_date = clock_timestamp() ` +
                          ` WHERE addr_id = $15 and (` + 
                          `      addr_for != $1 or branch_name != $2 or addr_line1 != $3 or addr_line2 != $4 or addr_line3 != $5 or ` +
                          `  city != $6 or pin != $7 or phone1 != $8 or phone2 != $9 or phone3 != $10 or email_id != $11 or website != $12 ` +
                          `  or status != $13);`
        await pool.query(lv_statement, [addrfor, branchname, addrLine1, addrLine2, addrLine3, city, pin, 
                                        phone1, phone2, phone3, email, website, addrstatus, userId, addrId ]);
      }
  
       //// Start : Contact Person Insert/Update
  
      for (let detail of details) {
        const { cont_pers_id,  contact_person, designation, department, cont_pers_mobile, cont_pers_phone, extn, cont_pers_email1, cont_pers_email2 } = detail;
        //console.log('detail ===> ',  detail);
        if (!cont_pers_id)
        {
          const max_result = await pool.query(`SELECT coalesce(max(cont_pers_id), 0) + 1  max_no FROM cdbm.cont_person_master;`);
          var lv_cont_pers_id = max_result.rows[0].max_no;
          lv_cont_person_inst_up = `insert into cdbm.cont_person_master ( ` +
                                                `  cont_pers_id, addr_id, cont_pers_name, designation, dept, email_id1, email_id2, ` +
                                               ` mobile, phone, extn, add_user_id, add_date) ` +
                                 ` values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, clock_timestamp()) `;
          await pool.query(lv_cont_person_inst_up, [lv_cont_pers_id, lv_addr_id, contact_person, designation, department, cont_pers_email1, cont_pers_email2, 
            cont_pers_mobile, cont_pers_phone, extn, userId ]);
        }
        else 
        {
          lv_cont_person_inst_up = `update cdbm.cont_person_master  ` +
                                      ` set cont_pers_name = $1, designation = $2, dept = $3, email_id1 = $4, email_id2 = $5, ` +
                                      `      mobile = $6, phone = $7, extn = $8, upd_user_id = $9, upd_date = clock_timestamp() ` +
                                      ` where cont_pers_id = $10 and addr_id = $11 and ` +
                                           ` (cont_pers_name != $1 or designation != $2 or dept != $3 or ` +
                                           ` email_id1 != $4 or email_id2 != $5 or ` +
                                      `      mobile != $6 or phone != $7 or extn != $8);`
          //console.log('lv_addr_id -> ', lv_addr_id);
          // console.log('cont_pers_id -> ', cont_pers_id);
           await pool.query(lv_cont_person_inst_up, [contact_person, designation, department, cont_pers_email1, cont_pers_email2, 
            cont_pers_mobile, cont_pers_phone, extn, userId, cont_pers_id, lv_addr_id ]);
        }
        
      } /// end of for loop
  
      lv_statement = '';
  
      await pool.query('COMMIT');
      //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
      res.json({message: '' });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting address/contact person:', error);
      res.status(500).send('Error inserting address/contact person. Please try again.');
    }
  });
  
  
  module.exports = cashbank_router;
