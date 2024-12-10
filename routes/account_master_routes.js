const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const acct_mast_router = express.Router();
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

acct_mast_router.get('/ddl_segment_master', async (req, res) => {
    try {
  
      let query = `SELECT seg_code, seg_name ` +
                 ` FROM cdbm.segment_master order by seg_code; ` ;
  
        const result = await pool.query(query);
  
        res.json(result.rows);
  
    } catch (error) {
        // logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
  acct_mast_router.get('/ddl_activity_master', async (req, res) => {
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
  
  acct_mast_router.get('/ddl_fin_group_level2', async (req, res) => {
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
  
  acct_mast_router.get('/ddl_fin_group_level3', async (req, res) => {
    try {
  
      const {p_grp_lvl2} = req.query;
  
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
  
  acct_mast_router.get('/ddl_fin_group_level4', async (req, res) => {
    try {
  
      const {p_grp_lvl3} = req.query;
  
      let query = `SELECT grp_cd_lvl4, grp_desc ` +
                 ` FROM cdbm.fin_group_level4 ` + 
                 ` WHERE grp_cd_lvl3 = ` + p_grp_lvl3 +
                 ` ORDER BY grp_desc; ` ;
  
        const result = await pool.query(query);
        res.json(result.rows);
  
    } catch (error) {
        res.status(500).send(error.message);
    }
  });
  
  acct_mast_router.get('/ddl_MI_master', async (req, res) => {
    try {
  
      var lv_grp_cd_lvl3 = req;
  
      let query = `SELECT MI_Code exc_Cd, MI_Name exc_Name ` +
                 ` FROM cdbm.MI_Master ` + 
                 ` WHERE MI_Type = 'EXC'`;
  
        const result = await pool.query(query);
        res.json(result.rows);
  
    } catch (error) {
        // logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
  
  acct_mast_router.post('/save_account_master', async (req, res) => {
    const { header } = req.body;
    const {  actCode, activityCode, exchange, segment, acctName, ledgType, typeAcc, 
             groupCode, subgroupCode, subsubgroupCode, panNo, actstatus, crn, userId } = header;
  
    try {
      await pool.query('BEGIN');
      var lv_act_cd = '';
 
      if (!actCode)
      {
        const max_result = await pool.query(`SELECT max(cast(substring(act_cd, 5) as numeric(11))) max_no 
                                              FROM cdbm.fin_account_master WHERE substring(act_cd, 1, 4) = 'SSLH'  ;`);
        var lv_max_no = max_result.rows[0].max_no;
        
        if (lv_max_no === 0) {
          lv_max_no = 1;
        }
        else {
          lv_max_no++;
        }

        if (lv_max_no < 10)
           lv_act_cd = 'SSLH0000000000' + lv_max_no;
        else if (lv_max_no < 100)
          lv_act_cd = 'SSLH000000000' + lv_max_no;
        else if (lv_max_no < 1000)
          lv_act_cd = 'SSLH00000000' + lv_max_no;
        else if (lv_max_no < 10000)
          lv_act_cd = 'SSLH0000000' + lv_max_no;
        else if (lv_max_no < 100000)
          lv_act_cd = 'SSLH000000' + lv_max_no;
        else if (lv_max_no < 1000000)
          lv_act_cd = 'SSLH00000' + lv_max_no;
        else if (lv_max_no < 10000000)
          lv_act_cd = 'SSLH0000' + lv_max_no;

        const lv_ins_statement = `Insert into cdbm.fin_account_master (
                                  act_cd, activity_cd, exc_cd, segment, account_name, ledg_type,
                                  grp_code, sub_grp_code, sub_sub_grp_code, status, pan_no, crn, add_user_id, type_acct, add_date)
                                  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'M', clock_timestamp());`;
                                  
        console.log('header ====> ', header);
        await pool.query(lv_ins_statement, [lv_act_cd, activityCode, exchange, segment, acctName, 'G',
                                            groupCode, subgroupCode, subsubgroupCode, actstatus, panNo, crn, userId]);
      }
      else 
      {
        lv_act_cd = actCode;
        lv_upd_statement = `update cdbm.fin_account_master 
                              set activity_cd  = $1, exc_cd=$2, segment=$3, account_name = $4, ledg_type=$5,
                              grp_code=$6, sub_grp_code=$7, sub_sub_grp_code=$8, status=$9, pan_no=$10, crn=$11, 
                              upd_user_id=$12, upd_date = clock_timestamp()
          where act_cd = $13;`;
          await pool.query(lv_upd_statement, [activityCode, exchange, segment, acctName, ledgType, 
                                              groupCode, subgroupCode, subsubgroupCode, actstatus, panNo, crn, 
                                              userId, actCode]);
      }
  
      await pool.query('COMMIT');
      //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
      res.json({message: lv_act_cd });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting voucher:', error);
      res.status(500).send('Error inserting account master. Please try again.');
    }
  
  });
  
  acct_mast_router.get('/search_account_master', async (req, res) => {
    const { p_account_name, p_group_code } = req.query;

    //changes on 10/12/2024, added order by
    let query = `SELECT act_cd, account_name, status, ledg_type, type_acct  ` +
      `FROM cdbm.fin_account_master WHERE ledg_type= 'G' ` +
      ` AND UPPER(account_name) LIKE UPPER('%` + p_account_name + `%') ORDER BY account_name`;
  
    if (p_group_code) {
      query += `AND grp_code = ${p_group_code};`;
    }
    try {
      //console.log('Final query:', query);
      const result = await pool.query(query);
      res.json(result.rows);
     // console.log('Query result:', result.rows);
    } catch (err) {
      console.error('Error executing query1:', err.message);
      res.status(500).send('Server error');
    }
  
  });
  
  acct_mast_router.get('/search_Acc_Master_ById', async (req, res) => {
    const { p_act_cd} = req.query;
    
    let query = `SELECT  act_cd, activity_cd, exc_cd, segment, account_name, ledg_type, grp_code, 
                 sub_grp_code, sub_sub_grp_code, status, crn, type_acct, pan_no  ` +
                ` FROM cdbm.fin_account_master WHERE act_cd = '`  + p_act_cd + `';`;
  
    try {
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query2:--->', err.message);
      res.status(500).send('Server error');
    }
  });
  
  acct_mast_router.get('/client_bank_ac_type', async (req, res) => {
    try {
      const result = await pool.query("SELECT COMM_ID, DESCRIPTION,nse_val FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'BANK_AC_TYPE'");
      res.json(result.rows);
      // console.log(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  acct_mast_router.post('/save_bank_details', async (req, res) => {
    const { userId, p_actCode, Bankdetails } = req.body;
  
    try {
      const max_no = await pool.query(`select coalesce(max(bank_dtl_id), 0) max_no from cdbm.bankDetails;`);
  
      var bankDtlId = Number(max_no.rows[0].max_no);
  
      const bankQuery = `INSERT INTO cdbm.bankDetails (BANK_DTL_ID, PARENT_ID, BANK_FOR, BANK_NAME, BANK_ACC_TYPE, BANK_ACC_NO, UPI_ID ` +
        `, START_DATE, END_DATE, IFSC, BANK_ADDR_1, BANK_ADDR_2, BANK_ADDR_3, STATUS, ADD_USER_ID, ADD_DATE) ` +
        `VALUES ($1, $2, $3, $4, $5, $6, $7, coalesce($8, clock_timestamp()), $9, $10,$11, $12, $13, $14, $15, clock_timestamp());`;
  
      var bankUpdateQuery = `update cdbm.bankDetails set bank_for = $1, bank_name = $2, bank_acc_type = $3 , bank_acc_no = $4 , upi_id = $5 ` +
        `, start_date = $6, end_date = CASE WHEN $12 = 'I' THEN clock_timestamp() ELSE $7 END,  ifsc = $8, bank_addr_1 = $9, bank_addr_2 = $10 ` +
        `, bank_addr_3 = $11, status = $12, add_user_id = $13, add_date = clock_timestamp() where bank_dtl_id = $14;`;
  
      for (const bankDetail of Bankdetails) {
  
        const { bank_dtl_id, bank_name, bank_acc_type, bank_acc_no, upi_id, start_date, end_date, ifsc, bank_address_1, bank_address_2
          , bank_address_3, ac_status, editMode } = bankDetail
  
        if (bank_dtl_id) {
          if (editMode) {
            await pool.query(bankUpdateQuery, ['accnt', bank_name, bank_acc_type, bank_acc_no, upi_id, start_date || null, end_date || null
              , ifsc, bank_address_1, bank_address_2, bank_address_3, ac_status, userId, bank_dtl_id]);
          }
        }
        else {
          bankDtlId += 1;
          await pool.query(bankQuery, [
            bankDtlId, p_actCode, 'accnt', bank_name || null, bank_acc_type || null, bank_acc_no, upi_id, start_date || null, end_date || null
            , ifsc, bank_address_1, bank_address_2, bank_address_3, ac_status, userId,
          ]);
        }
      }
      res.status(201).json({ message: 'Data saved successfully' });
    } catch (error) {
      console.error('Error inserting data:', error);
      res.status(500).json({ error: 'An error occurred while saving data' });
    }
  });
  
  acct_mast_router.get('/get_bank_details', async (req, res) => {
    try {
  
      const { p_actCode} = req.query;
  
      const query = `select bank_dtl_id, bank_name, bank_acc_type, bank_acc_no, upi_id, to_char(start_date, 'yyyy-MM-dd') start_date, ` +
        `to_char(end_date, 'yyyy-MM-dd') end_date, ifsc, bank_addr_1, bank_addr_2, bank_addr_3, status from cdbm.bankDetails ` +
        `where parent_id = $1 order by bank_name;`;
  
      const result = await pool.query(query, [p_actCode]);
  
      res.json(result.rows);
    }
    catch (error) {
      console.error('Error inserting data:', error);
      res.status(500).json({ error: 'An error occurred while saving data' });
    }
  });

  acct_mast_router.get('/search_BankBranches', async (req, res) => {
    const { branchname, bankname, addr1 } = req.query;
    let queryParams = [];
    let query = `SELECT addr_id, branch_name, addr_for bank_name, addr_line1 FROM cdbm.address_master WHERE addr_type='BANK'`;
  
    query += ` AND UPPER(branch_name) LIKE UPPER('%` + branchname + `%')`;
    query += ` AND UPPER(addr_for) LIKE UPPER('%` + bankname + `%')`;
    query += ` AND UPPER(addr_line1) LIKE UPPER('%` + addr1 + `%')`;
    
    try {
      //const result = await pool.query(query, queryParams);
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
  
  acct_mast_router.post('/save_cheque_nos', async (req, res) => {
    const { header, details } = req.body;
    const { p_cbAcctCode, userId } = header;
   
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
                          ` where chq_id = $4 and cb_act_cd = $5 and from_chq_no != $1 and to_chq_no != $2 `;
            await pool.query(lv_statement, [from_chq_no, to_chq_no, userId, chq_id, p_cbAcctCode ]);
          }
                  
      } // end of for loop
  
      await pool.query('COMMIT');
      //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
      res.json({message: '' });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting voucher:', error);
      res.status(500).send('Error inserting voucher(s). Please try again.');
    }
  });
  
  acct_mast_router.post('/save_address_cont_persons', async (req, res) => {
    const { header, details } = req.body;
    //const { header} = req.body;
    const { addrId, p_actCode, branchname, addrfor, addrLine1, addrLine2, addrLine3, city, pin, phone1, phone2, phone3,
            email, website, addrstatus, addrtype, userId } = header;
  
    try {
      await pool.query('BEGIN');
  
      var lv_statement = '';
      var lv_cont_person_inst_up = '';
      var lv_cont_pers_id = 0;
      var lv_addr_id = 0;
  
      if (!addrId)
      {
        const max_result = await pool.query(`SELECT coalesce(max(addr_id), 0) + 1  max_no FROM cdbm.address_master;`);
        lv_addr_id = max_result.rows[0].max_no;
        lv_statement = `Insert into cdbm.address_master (addr_id, parent_id, addr_type, addr_for, branch_name, addr_line1, addr_line2, addr_line3, ` +
                                                        ` city, pin, phone1, phone2, phone3, email_id, website, status, add_user_id, add_date) ` +
                                                ` values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, clock_timestamp());`;
        await pool.query(lv_statement, [lv_addr_id, p_actCode, addrtype, addrfor, branchname, addrLine1, addrLine2, addrLine3, 
                                        city, pin, phone1, phone2, phone3, email, website, addrstatus, userId ]);
      }
      else {
        lv_addr_id = addrId;

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

        if (contact_person.length)
        {
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
               await pool.query(lv_cont_person_inst_up, [contact_person, designation, department, cont_pers_email1, cont_pers_email2, 
                cont_pers_mobile, cont_pers_phone, extn, userId, cont_pers_id, lv_addr_id ]);
            }
        } // end for : if (contact_person)
        
      } /// end of for loop
  
      lv_statement = '';
  
      await pool.query('COMMIT');
      res.json({message: lv_addr_id});
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error inserting address/contact person:', error);
      res.status(500).send('Error inserting address/contact person. Please try again.');
    }
  });
  
  acct_mast_router.get('/get_cont_persons', async (req, res) => {
    const { p_addr_id } = req.query;
    
    let query = `SELECT cont_pers_id, addr_id, cont_pers_name, designation, dept, email_id1, email_id2, mobile, phone, extn, status ` +
      ` FROM cdbm.cont_person_master WHERE addr_id = ` + p_addr_id + `;`;
    try {
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query:', err.message);
      res.status(500).send('Server error');
    }
  });
  
  acct_mast_router.get('/get_addresses', async (req, res) => {
    const { p_addr_type, p_act_Code } = req.query;
    
    let query = `SELECT addr_id, addr_type, addr_for, branch_name, micr, addr_line1, addr_line2, addr_line3, ` +
                       ` city, pin, phone1, phone2, phone3, email_id, website, status ` +
      ` FROM cdbm.address_master WHERE UPPER(addr_type) = UPPER('` + p_addr_type + `') ` +
      ` and parent_id = '` + p_act_Code  + `';`;
  
    try {
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query:', err.message);
      res.status(500).send('Server error');
    }
  });
  
  module.exports = acct_mast_router;
