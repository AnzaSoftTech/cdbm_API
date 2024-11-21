const express = require('express');
const master_upload_router = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const logError = require('../error-logger');
const multer = require('multer');
const fs = require('fs');
const fastcsv = require('fast-csv');
const { v4: uuidv4 } = require('uuid');

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

const csvDirectory = './uploads'; // Change to your directory path

const storage = multer.diskStorage({
  destination: csvDirectory,
  filename: function (req, file, cb) {
    
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, req.query.filecd + '-' + uniqueSuffix + ext);
  }
});


// Init upload
const upload = multer({
  storage: storage
}).array('files', 10);

master_upload_router.get('/sauda_metadata', async (req, res) => {
  const { exch_cd, segment } = req.query;
  //const { exch_cd, segment, date } = req.query;
  //var e =req.query["exch_cd"];
  //var s =req.query["segment"];
  try {
    await pool.query(`delete from cdbm.master_file_name;`);
    const query = `SELECT file_cd, exch_cd, segment, file_name, file_interval, file_nomenclature, expected_time, 
	                        file_type, disp_ui, to_char(last_upld_datetime, 'DD-Mon-YYYY HH24:MI:SS') as upd_date_time,
                          last_status        
                     FROM cdbm.file_upload_master WHERE disp_ui = 'Y' ORDER BY file_cd `;
      
    //   AND ($1::text IS NULL OR exch_cd ='`+ req.query["exch_cd"] + `')
    //   AND ($2::text IS NULL OR segment = '`+ req.query["segment"] + `')`;
    // const values = [exch_cd, segment];

    //const values = [exch_cd, segment, date];
    //const result = await pool.query(query, values);
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    logError(err, req);
    //console.error(err.message);
    res.status(500).send('Server error');
  }
});

master_upload_router.post('/MasterFileupload', async (req, res) => {
  try {
    const { filecd, filename } = req.query;
    //console.log('filecd, filename', filecd, filename);

    upload(req, res, (err) => {
      if (err) {
        return res.status(500).json({ msg: err.message });
      }
      res.status(200).json({ msg: 'Files Uploaded Successfully', filename: 'fname' });
    });
    /// Inserting selected file names into a table, to be used in database
    await pool.query(`delete from cdbm.master_file_name where file_cd = '` + filecd + `';`);
    await pool.query(`insert into cdbm.master_file_name (file_cd, file_name, datetime) values ('` + filecd + `', '` + filename + `', clock_timestamp());`);
  }
  catch (err) {
    console.log('Error : ', err);
    logError(err, req);
    res.status(500).send('Server error');
  }
});

//-----Helper function to process var files--------
master_upload_router.post('/insert-var-file-stag', async (req, res) => {
  try {
    const files = fs.readdirSync(csvDirectory); //.filter(file => file.endsWith('.csv'));
    await pool.query(`delete from cdbm.stag_var_one_column`); // STAG_VAR_ONE_COLUMN
    for (const file of files) {
      if (file.startsWith('VAR_FILE')) {
          const filePath = path.join(csvDirectory, file);
          if (fs.existsSync(filePath)) {
            //console.log('bhav copy  Inside for loop, processing file:', filePath);
            await processVarFile(filePath);
            fs.unlinkSync(filePath); // Delete the file after processing
          } else {
            console.warn(`File ${file} does not exist.`);
          }
      }
  }
    res.json({ message: 'Var file/s processed successfully' });
  } catch (error) {
    console.error('Error processing Var files:', error);
    res.status(500).json({ message: 'Error processing Var files' });
  }
});

const processVarFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const csvData = [];
    const csvStream = fastcsv
      .parse({headers: false}) // Remove headers: false option
      .on('data', (data) => {
        csvData.push(data); // Push entire row of data
      })
      .on('end', async () => {
        try {
          //console.log('===== before var insert ======');
          //console.log(csvData[0]);
          for (const row of csvData) {
            await pool.query(`
              INSERT INTO cdbm.stag_var_one_column (row_data) VALUES ($1) `, [row]);
          }
          // temp await execProcedure();
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });

    stream.pipe(csvStream);
  });
};


//-----Helper function to process bhav copy  files--------
master_upload_router.post('/insert-bhav-copy-stag', async (req, res) => {
  try {
    const files = fs.readdirSync(csvDirectory).filter(file => file.endsWith('.csv'));
    await pool.query(`delete from cdbm.stag_bhav_copy`);
    for (const file of files) {
      if (file.startsWith('BHAV_COPY')) {
          const filePath = path.join(csvDirectory, file);
          if (fs.existsSync(filePath)) {
            //console.log('bhav copy  Inside for loop, processing file:', filePath);
            await processBhavCopyFile(filePath);
            fs.unlinkSync(filePath); // Delete the file after processing
          } else {
            console.warn(`File ${file} does not exist.`);
          }
      }
  }
    //console.log('CSV file/s processed successfully');
    res.json({ message: 'BhavCopy file/s processed successfully' });
  } catch (error) {
    logError(error, req);
    console.error('Error processing Bhav Copy files:', error);
    res.status(500).json({ message: 'Error processing Bav Copy files' });
  }
});
//------fuction insert into db BhavCopy file --------
const processBhavCopyFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const csvData = [];
    const csvStream = fastcsv
      .parse({headers: false}) // Remove headers: false option
      .on('data', (data) => {
        csvData.push(data); // Push entire row of data
      })
      .on('end', async () => {
        try {
          //console.log(csvData[0]);
          for (const row of csvData) {
            await pool.query(`
              INSERT INTO cdbm.stag_bhav_copy (
                          trad_dt, biz_dt, sgmt, src, inst_type, unt_idfr_trd_exc, isin, inst_symbol, inst_series, inst_orig_exp_dt, 
                          inst_act_exp_dt, strk_price, option_tp, fin_instrm_nm, opn_price, hgh_price, low_price, last_price, cls_price,
                          prev_clsg_price, undrlyg_price, sttlment_price, open_int, chng_in_opn_int, total_trade_vol, total_trade_val,
                          total_no_trade, session_id, new_mkt_lot_qty, remarks, reserved_1, reserved_2, reserved_3, reserved_4)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
                $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34) `, 
            [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], 
              row[12], row[13], row[14], row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22], 
              row[23],row[24], row[25], row[26], row[27], row[28], row[29], row[30], row[31], row[32], row[33]]);
          }
          // temp await execProcedure();
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });

    stream.pipe(csvStream);
  });
};


// //-----Helper function to process settlement master files--------
master_upload_router.post('/insert-settlement-master-stag', async (req, res) => {
  const { filecd } = req.query; // Get filecd from query parameters

  try {
    const files = fs.readdirSync(csvDirectory).filter(file => file.endsWith('.csv'));
    for (const file of files) {
      const filePath = path.join(csvDirectory, file);

      if (file.startsWith('SETTLE')) {
        if (fs.existsSync(filePath)) {
          try {
            await processSettlementMasterFile(filePath, filecd);
            fs.unlinkSync(filePath); // Delete the file after processing
          } catch (error) {
            console.error('Error processing file:', file, error.message);
            
            // Log error into the database
            try {
              await pool.query('CALL CDBM.usp_Master_File_ErrorLog($1, $2)', [filecd, error.message]);
            } catch (logError) {
              console.error('Error logging to database:', logError.message);
            }
            
            return res.status(400).json({ message: `Error processing file ${file}: ${error.message}` });
          }
        } else {
          console.warn(`File ${file} does not exist.`);
        }
      }
    }
    //console.log('CSV file/s processed successfully');
    res.json({ message: 'Master file/s processed successfully' });
  } catch (error) {
    console.error('Error processing Master files:', error);
    
    // Log error into the database
    try {
      await pool.query('CALL CDBM.usp_Master_File_ErrorLog($1)', [filecd]);
    } catch (logError) {
      console.error('Error logging to database:', logError.message);
    }
    
    res.status(500).json({ message: 0 });
  }

});


//------fuction insert into db SettlementMaster file --------
const processSettlementMasterFile = async (filePath) => {

  console.log('Reading the file and inserting into DB');
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const csvData = [];
    const csvStream = fastcsv
      .parse({headers: false}) // Remove headers: false option
      .on('data', (data) => {
        csvData.push(data); // Push entire row of data
      })
      .on('end', async () => {
        try {
          //console.log(csvData[0]);
          for (const row of csvData) {
            await pool.query(`
              INSERT INTO cdbm.stag_settlement_master (
                          sgmt, src, trad_session_id, nsdl_mkt_type, csdl_mkt_type, settle_type, settle_no, 
                          spcl_settle_no, trad_start_datetime, trad_end_datetime, cust_conf_datetime, oblgtn_datetime, 
                          fnds_payin_datetime, fnds_payout_datetime, sec_payin_datetime, sec_payout_datetime, auct_sttle_type, 
                          auct_sttle_no, remarks, reserved_1, reserved_2, reserved_3, reserved_4)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
            `, 
            [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], 
              row[12], row[13], row[14], row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22] 
            ]);
          }
          // temp await execProcedure();
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });

    stream.pipe(csvStream);
  });
};

master_upload_router.post('/insert-corp_action-stag', async (req, res) => {
  try {
    //console.log('inside /insert-corp_action-stag');
    const files = fs.readdirSync(csvDirectory).filter(file => file.endsWith('.csv'));
    await pool.query(`delete from cdbm.stag_corp_action`);
    for (const file of files) {
      if (file.startsWith('CORP_ACT')) {
          const filePath = path.join(csvDirectory, file);
          if (fs.existsSync(filePath)) {
            await processCorpActFile(filePath);
            fs.unlinkSync(filePath); // Delete the file after processing
          } else {
            console.warn(`File ${file} does not exist.`);
          }
      }
  }
    res.json({ message: 'Corp Action file/s processed successfully' });
  } catch (error) {
    console.error('Error processing Corp Action files:', error);
    res.status(500).json({ message: 'Error processing Corp Action files' });
  }
});
//------fuction insert into db Corp Act file --------
const processCorpActFile = async (filePath) => {
  return new Promise((resolve, reject) => {
   // console.log('inside processCorpActFile')
    const stream = fs.createReadStream(filePath);
    const csvData = [];
    const csvStream = fastcsv
      .parse({headers: false}) // Remove headers: false option
      .on('data', (data) => {
        csvData.push(data); // Push entire row of data
      })
      .on('end', async () => {
        try {
          //console.log(csvData[0]);
          for (const row of csvData) {
            await pool.query(`
              INSERT INTO cdbm.stag_corp_action (
                          symbol, series, security_desc, sec_code, sec_rec_date, sec_bc_start_date, 
                          sec_bc_end_date, sec_ex_date, sec_ndl_start_date, sec_ndl_end_date, 
                          sec_settle_type, sec_settle_no, corp_action_desc, isin, act_can_flag)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) `, 
            [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], 
              row[12], row[13], row[14]]);
          }
          // temp await execProcedure();
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });

    stream.pipe(csvStream);
  });
};

master_upload_router.post('/insert-scrip_master-stag', async (req, res) => {
  try {
    const files = fs.readdirSync(csvDirectory).filter(file => file.endsWith('.csv'));
    await pool.query(`delete from cdbm.stag_scrip_master`);
    for (const file of files) {
      if (file.startsWith('SCRIP_MAST')) {
          const filePath = path.join(csvDirectory, file);
          if (fs.existsSync(filePath)) {
            await processScriptMasterFile(filePath);
            fs.unlinkSync(filePath); // Delete the file after processing
          } else {
            console.warn(`File ${file} does not exist.`);
          }
      }
  }
    res.json({ message: 'Scrip Master file processed successfully' });
  } catch (error) {
    console.error('Error processing Scrip Master files:', error);
    res.status(500).json({ message: 'Error processing Scrip Master files' });
  }
});
//------fuction insert into db Scrip Master file --------
const processScriptMasterFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const csvData = [];
    const csvStream = fastcsv
      .parse({headers: false}) // Remove headers: false option
      .on('data', (data) => {
        csvData.push(data); // Push entire row of data
      })
      .on('end', async () => {
        try {
          //console.log(csvData[0]);
          for (const row of csvData) {
            await pool.query(`
              INSERT INTO cdbm.stag_scrip_master (symbol, series, security_desc, sec_code, isin, settle_type)
              VALUES ($1,$2,$3,$4,$5,$6) `, 
            [row[0], row[1], row[2], row[3], row[4], row[5]]);
          }
          // temp await execProcedure();
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });

    stream.pipe(csvStream);
  });
};

/// staging Holding data

master_upload_router.post('/daily-holdings-stag', async (req, res) => {
  try {
    const files = fs.readdirSync(csvDirectory).filter(file => file.endsWith('.csv'));
    await pool.query(`delete from cdbm.stage_dpm_soh`);
    for (const file of files) {
      if (file.startsWith('HOLDINGS')) {
          const filePath = path.join(csvDirectory, file);
          if (fs.existsSync(filePath)) {
            await processHoldingFile(filePath);
            fs.unlinkSync(filePath); // Delete the file after processing
          } else {
            console.warn(`File ${file} does not exist.`);
          }
      }
  }
    res.json({ message: 'Holding file processed successfully' });
  } catch (error) {
    console.error('Error processing Holding files:', error);
    res.status(500).json({ message: 'Error processing Holding files' });
  }
});

const processHoldingFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const csvData = [];
    const csvStream = fastcsv
      .parse({headers: false}) // Remove headers: false option
      .on('data', (data) => {
        csvData.push(data); // Push entire row of data
      })
      .on('end', async () => {
        try {
          //console.log(csvData[0]);
          for (const row of csvData) {
            await pool.query(`
              INSERT INTO cdbm.stage_dpm_soh (source, dp_id, branch_code, line_no, benefic_catg, benefic_id, isin, market_type, settle_no, record_type, 
                          curr_bal, bndcryacctpos, demat_pndg_verf_bal, demat_pndg_confrm_bal, lent_bal, brrw_bal, lock_in_bal_unr_rmat, isin_freeze_for_dr_cr, 
                          boid_freeze_for_dr_cr, boisin_freeze_for_dr_cr, repledge_bal, cc_id, block_lock_flag, block_lock_code, lock_in_bal, lock_in_release_date, 
                          pledge_bal, earmrk_bal, safe_keep_bal, rmtrlstn_pdg_bal, avl_for_lend_bal, cm_delivery, cm_receipt, beneficiary_hold_trnsit_bal, 
                          beneficiary_hold_balance, cm_pool, cm_transit, transit_bal, statement_date, remarks, reserved_1, reserved_2, reserved_3, reserved_4)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                      $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44); `, 
            [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13], row[14], row[15],
             row[16], row[17], row[18], row[19], row[20], row[21], row[22], row[23], row[24], row[25], row[26], row[27], row[28], row[29], row[30],
             row[31], row[32], row[33], row[34], row[35], row[36], row[37], row[38], row[39], row[40], row[41], row[42], row[43]]);
          }
          // temp await execProcedure();
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });

    stream.pipe(csvStream);
  });
};

 master_upload_router.post('/exec_db_Procedure', async (req, res) => {
  try {

    //const {selectedRadioOpt} = req.query;
    //console.log('inside /exec_db_Procedure');
    const lv_status = await pool.query('CALL cdbm.usp_Master_File_Uploads($1)', [0]);
    res.json({message: lv_status.rows[0].p_status }); 

  } catch (error) {
    logError(error, req);
    console.error('Error processing Master files:', error);
    //fs.unlinkSync(filePath);
    res.status(500).json({ message: 'Error processing Master files' });
  }
});


//master_upload_router.post('/execute-procedure', async (req, res) => {
const execProcedure = async () => {
  //return new Promise((resolve, reject) => {
  console.log('Executing the procedure in the DB');
  const jobId = uuidv4();
  //await pool.query('INSERT INTO cdbm.job_status (job_id, status) VALUES ($1, $2)', [jobId, 'processing']);
  //res.status(202).json({ message: 'Processing started', jobId });
  try {
    await pool.query('CALL cdbm.my_procedure()');
    console.log('Procedure executed successfully');
  } catch (error) {
    logError(error, req);
    console.error('Error executing procedure:', error);
    // Handle error
  }
 };

 master_upload_router.get('/job-status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
//    const result = await pool.query('SELECT status, error_message FROM cdbm.job_status WHERE job_id = $1', [jobId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);

    } else {
      res.status(404).json({ message: 'Job not found' });

    }
  } catch (error) {
    logError(error, req);
    res.status(500).json({ message: 'Error fetching job status', error: error.message });

  }
});


module.exports = master_upload_router;
