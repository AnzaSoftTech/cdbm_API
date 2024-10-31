const express = require('express');
const sauda_upload_router = express.Router();
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
const { Console } = require('console');

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


sauda_upload_router.get('/last_upd_date_status', async (req, res) => {
    try {
      const query = `SELECT TO_CHAR(last_upld_datetime, 'DD-MM-YYYY hh24:mi:ss') last_upld_datetime, last_status 
                      FROM cdbm.file_upload_master WHERE file_cd in ('D_OBLIGN', 'CASH_SBOOK') order by file_cd ` ;
      const result = await pool.query(query);
      res.json(result.rows);
      //console.log('insode last_upd_date_status', result);
    //  console.log(result.rows);
    } catch (err) {
      //console.error(err.message);
      logError(err, req);
      res.status(500).send('Server error');
    }
  });
  
  /*
  sauda_upload_router.get('/sauda_metadata', async (req, res) => {
    const { exch_cd, segment} = req.query;
    try {
      const query = `SELECT * FROM cdbm.file_upload_master
        WHERE 1=1 AND ($1::text IS NULL OR exch_cd ='`+req.query["exch_cd"]+`')
        AND ($2::text IS NULL OR segment = '`+req.query["segment"]+`')`
      const values = [exch_cd, segment];
      const result = await pool.query(query, values);
      res.json(result.rows);
    } catch (err) {
        logError(err, req);
      res.status(500).send('Server error');
    }
  });
  */
  
  // *************************************************************************
  // *************************************************************************
  // Start Trade file Upload/Process. 
  // *************************************************************************
  // *************************************************************************
  
  const csvDirectory = './uploads/trade_file'; // Change to your directory path
  
  // Set up storage engine
  const storage = multer.diskStorage({
    //destination: './uploads/',
    destination: csvDirectory,
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
  // Init upload
  const upload = multer({
    storage: storage
  }).array('files', 10);
  
  sauda_upload_router.post('/upload', (req, res) => {

    upload(req, res, (err) => {
      if (err) {
        console.log('upload 2', err);
        logError(err, req);
        return res.status(500).json({ msg: err.message });
      }
      res.status(200).json({ msg: 'Files Uploaded Successfully' });
    });
  });
  
  
  // -----Helper function to process files csv------
  sauda_upload_router.post('/process-trade-file', async (req, res) => {
    try {
  
      const {selectedRadioOpt} = req.query;
      const {TradeDate} = req.query;
      const {TradeFileName} = req.query;
      const files = fs.readdirSync(csvDirectory); //.filter(file => file.endsWith('.TXT'));
  
      for (const file of files) {
        const filePath = path.join(csvDirectory, file);
        //console.log(' <======== orignal_file_name =======> ', orignal_file_name);
        const lv_status = await pool.query('CALL cdbm.usp_Check_Upload_In_Run($1, $2)', [TradeFileName, 0]);
  
        if (lv_status.rows[0].p_status != '0')
        {
          //fs.unlinkSync(filePath);
          res.json({message: '1' }); // Process is already running
          return;
        }
        else  if (lv_status.rows[0].p_status === '0')
        {
           await execProcedure(filePath, selectedRadioOpt);
           const returnValue = await pool.query('CALL cdbm.usp_File_Upload($1, $2, $3, $4)', [TradeFileName, selectedRadioOpt, TradeDate, 0]);
           res.json({message: returnValue.rows[0].p_status }); 
        }
        fs.unlinkSync(filePath);
       }
      //res.json({ message: 'CSV file/s processed successfully' });
    } catch (error) {
      //console.error('Error processing CSV files:', error);
      logError(error, req);
      fs.unlinkSync(filePath);
      res.status(500).json({ message: 'Error processing CSV files' });
    }
  });
  
  //sauda_upload_router.post('/execute-procedure', async (req, res) => {
  
  const execProcedure = async (filePath, selectedRadioOpt) => {
      //console.log(' ****** execProcedure filePath => ', filePath);
      try {
          if (selectedRadioOpt === "TXT")
          {
               await ins_TXT_stag_table(filePath);
          }
          else if (selectedRadioOpt === "CSV")
          {
            await ins_CSV_stag_table(filePath);
          }
          else if (selectedRadioOpt === "FTP")
          {
            await ins_FTP_stag_table(filePath);
          }
  
      } catch (error) {
        console.error('Error executing procedure:', error);
        logError(err, req);
        return '9999';
        //await pool.query('UPDATE cdbm.job_status SET status = $1, error_message = $2 WHERE job_id = $3', ['failed', error.message, jobId]);
      }
    };
    
  
  /// Inserting CSV file data into DB Stag table.
  const ins_CSV_stag_table = async (filePath) => {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      const csvData = [];
      const csvStream = fastcsv
        .parse({ headers: false })
        .on('data', (data) => {
          csvData.push(data);
        })
        .on('end', async () => {
          try {
            //console.log(csvData[0]);
            for (const row of csvData) {
              await pool.query(`INSERT INTO cdbm.stag_cm_sb_csv (
              trade_date,business_date, segment,file_source,exchange,clr_mem_code,
                  broker_id, inst_type, inst_id,isin,symbol, security_series,xpiry_date, 
                  inst_xpiry_date, stk_price, option_type,inst_name,client_type,client_id, 
                  fully_exc_conf_snt,orig_cust_part_id, cust_part_id, settle_type, sec_settle_txn_id,
                  buy_sell_ind,trade_qty,new_brd_lot_qty,price,unq_trade_id,rept_txn_status,trade_date_time,
                  upd_date,ord_ref_no,order_date_time,trade_dealer_id,ctc_id,trade_regn_orgn,order_type,
                  block_deal_ind,settle_cycle,mkt_type_id,remarks,reserved_1,reserved_2,reserved_3,reserved_4
            )  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
              $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,
              $39,$40,$41,$42,$43,$44,$45,$46)`, [
                row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], 
                row[12], row[13], row[14], row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22], 
                row[23],row[24], row[25], row[26], row[27], row[28], row[29], row[30], row[31], row[32], row[33], 
                row[34], row[35],row[36],row[37], row[38], row[39], row[40], row[41], row[42], row[43], row[44], row[45]
              ]);
            }
            await execProcedure();
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
            logError(error, req);
          reject(error);
        });
  
      stream.pipe(csvStream);
    });
  };
  
  /// Inserting FTP file data into DB Stag table.
  const ins_FTP_stag_table = async (filePath) => {
   // console.log('Reading the file and inserting into DB FTP');
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
            //console.log('before ftp insert --> ', csvData[0]);
            for (const row of csvData) {
              await pool.query(`
                INSERT INTO cdbm.stag_cm_sb_ftp (
                  trade_date,business_date, segment,file_source,exchange,clr_mem_code,
                  broker_id, inst_type, inst_id,isin,symbol, security_series,xpiry_date, 
                  inst_xpiry_date, stk_price, option_type,inst_name,client_type,client_id, 
                  fully_exc_conf_snt,orig_cust_part_id, cust_part_id, settle_type, sec_settle_txn_id,
                  buy_sell_ind,trade_qty,new_brd_lot_qty,price,unq_trade_id,rept_txn_status,trade_date_time,
                  upd_date,ord_ref_no,order_date_time,trade_dealer_id,ctc_id,trade_regn_orgn,order_type,
                  block_deal_ind,settle_cycle,mkt_type_id,remarks,reserved_1,reserved_2,reserved_3,reserved_4
                )
                VALUES (
                  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
                  $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
                  $41,$42,$43,$44,$45,$46
                )
              `, 
              [
                row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], 
                row[12], row[13], row[14], row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22], 
                row[23],row[24], row[25], row[26], row[27], row[28], row[29], row[30], row[31], row[32], row[33], 
                row[34], row[35],row[36],row[37], row[38], row[39], row[40], row[41], row[42], row[43],row[44], row[45]
              ]);
            }
            await execProcedure();
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
            logError(error, req);
          reject(error);
        });
  
      stream.pipe(csvStream);
    });
  };
  
  /// Inserting txt file data into DB Stag table.
  const ins_TXT_stag_table = async (filePath) => {
    //console.log('Reading the file and inserting into DB TXT');
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
                INSERT INTO cdbm.stag_cm_sb_txt (
                  trade_no,status, symbol, series, sec_name, inst_type,
                  book_type, market_type, user_id, branch_id, buy_sell_ind, trade_qty,
                  trade_price, pro_cl_wh, client_code, part_code, auc_part_type, auc_no,
                  settle_period, trade_date_time, last_mod, ord_no, cp_id, order_mod_dt_tm
                )
                VALUES (
                  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                  $21,$22,$23,$24
                )
              `, 
              [
                row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], 
                row[12], row[13], row[14], row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22], 
                row[23]
              ]
              /*[
                row.trade_no, row.status, row.symbol, row.series, row.sec_name,
                row.inst_type, row.book_type, row.market_type, row.user_id, row.branch_id,
                row.buy_sell_ind, row.trade_qty, row.trade_price, row.pro_cl_wh, row.client_code,
                row.part_code, row.auc_part_type, row.auc_no, row.settle_period, row.trade_date_time,
                row.last_mod, row.ord_no, row.cp_id, row.order_mod_dt_tm
              ]*/);
            }
            await execProcedure();
            resolve();
          } catch (error) {
            logError(error, req);
            reject(error);
          }
        })
        .on('error', (error) => {
            logError(error, req);
          reject(error);
        });
  
      stream.pipe(csvStream);
    });
  };
  
  // *************************************************************************
  // *************************************************************************
  // End Trade file Upload/Process. 
  // *************************************************************************
  // *************************************************************************
  
  
  // ******************************************************************************
  // ******************************************************************************
  // Start Auction Price file Upload. This will be called on click of upload button
  // ******************************************************************************
  // ******************************************************************************
  
  const auctpriceDirectory = './uploads/auct_price'; // Change to your directory path
  
  sauda_upload_router.post('/auct_price_upload', (req, res) => {
    auct_price_upload(req, res, (err) => {
      //console.log("oblig_file_upload => ", req);
      if (err) {
        return res.status(500).json({ msg: err.message });
      }
      
      res.status(200).json({ msg: 'Auction Price File Uploaded Successfully' });
    });
  });
  
  // Set up storage engine
  const auct_price_storage = multer.diskStorage({
    destination: auctpriceDirectory,
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
  const auct_price_upload = multer({
    storage: auct_price_storage
  }).array('files', 10);
  
  sauda_upload_router.post('/process-auct-price', async (req, res) => {
    try {
      const files = fs.readdirSync(auctpriceDirectory).filter(file => file.endsWith('.txt'));
      for (const file of files) {
        const filePath = path.join(auctpriceDirectory, file);
        await insert_auct_file(filePath); //process_oblig_file(filePath);
        //await processCSVFile(filePath);
        fs.unlinkSync(filePath);
      }
      res.json({ message: 'CSV file/s processed successfully' });
    } catch (error) {
      fs.unlinkSync(filePath);
      logError(error, req);
      //console.error('Error processing CSV files:', error);
      res.status(500).json({ message: 'Error processing CSV files' });
    }
  });
  
  const insert_auct_file = async (filePath) => {
    //return new Promise((resolve, reject) => {
    //const jobId = uuidv4();
    try {
      await pool.query(`delete from cdbm.stag_auction_price`);
      await insert_auct_stag(filePath);
          //await pool.query('CALL cdbm.usp_File_Upload($1, $2, $3)', ['Trade_NCL_CM_0_CM_10245_20240603_F_0000', 'CSV', 0]);
     
    } catch (error) {
      console.error('Error executing procedure:', error);
      logError(error, req);
      //await pool.query('UPDATE cdbm.job_status SET status = $1, error_message = $2 WHERE job_id = $3', ['failed', error.message, jobId]);
     
    }
  };
  
  const insert_auct_stag = async (filePath) => {
    
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      const csvData = [];
      const csvStream = fastcsv
        .parse({ headers: false })
        .on('data', (data) => {
          csvData.push(data);
        })
        .on('end', async () => {
          try {
            //console.log(csvData[0]);
            for (const row of csvData) {
              await pool.query(`INSERT INTO cdbm.stag_auction_price (symbol, series, price)
                VALUES ($1,$2,$3) `, [row[0], row[1], row[2]]);
            }
            await insert_auct_stag();
            resolve();
          } catch (error) {
            logError(error, req);
            reject(error);
          }
        })
        .on('error', (error) => {
            logError(error, req);
          reject(error);
        });
  
      stream.pipe(csvStream);
    });
  };
  
  // ******************************************************************************
  // ******************************************************************************
  // End Auction Price file Upload. This will be called on click of upload button
  // ******************************************************************************
  // ******************************************************************************
  
  // ***************************************************************************
  // ***************************************************************************
  // Start Obligation file Upload/Process. 
  // ***************************************************************************
  // ***************************************************************************
  
  const obligDirectory = './uploads/oblign_file'; // Change to your directory path
  
  sauda_upload_router.post('/oblig_file_upload', (req, res) => {
    oblig_upload(req, res, (err) => {
      //console.log("oblig_file_upload => ", req);
      if (err) {
        return res.status(500).json({ msg: err.message });
      }
      res.status(200).json({ msg: 'Obligation File Uploaded Successfully' });
    });
  });
  
  // Set up storage engine
  const oblig_storage = multer.diskStorage({
    destination: obligDirectory,
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
  const oblig_upload = multer({
    storage: oblig_storage
  }).array('files', 10);
  
  /// On click of Load Obligation File button
  
  sauda_upload_router.post('/process-obligation', async (req, res) => {
    try {
      const files = fs.readdirSync(obligDirectory).filter(file => file.endsWith('.csv'));
      for (const file of files) {
        const filePath = path.join(obligDirectory, file);
        await process_oblig_file(filePath);
        fs.unlinkSync(filePath);
      }
      res.json({ message: 'CSV file/s processed successfully' });
    } catch (error) {
      fs.unlinkSync(filePath);
      logError(error, req);
      //console.error('Error processing CSV files:', error);
      res.status(500).json({ message: 'Error processing CSV files' });
    }
  });
  
  const process_oblig_file = async (filePath) => {
    //const jobId = uuidv4();
    try {
      await insert_oblig_stag(filePath);
      await pool.query('CALL cdbm.usp_Porcess_Obligation($1, $2)', ['Obligation_NCL', 0]);
     
    } catch (error) {
      console.error('Error executing procedure:', error);
      logError(error, req);
      //await pool.query('UPDATE cdbm.job_status SET status = $1, error_message = $2 WHERE job_id = $3', ['failed', error.message, jobId]);
    }
  };
  
  const insert_oblig_stag = async (filePath) => {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      const csvData = [];
      const csvStream = fastcsv
        .parse({ headers: false })
        .on('data', (data) => {
          csvData.push(data);
        })
        .on('end', async () => {
          try {
            //console.log(csvData[0]);
            for (const row of csvData) {
              await pool.query(`INSERT INTO cdbm.obligation_stag (
                        segment, file_source, clr_mem_id, trd_mem_id, inst_idfr, inst_isin, inst_symbol, series,
                        settle_type, settle_no, trd_session_id, client_code, cust_code, cp_code, oblg_date, fund_pay_in_date,
                        fund_pay_out_date, comm_pay_in_date, comm_pay_out_date, buy_volume, sell_volume, buy_amount, sell_amount,
                        cumm_buy_volume, cumm_sell_volume, cumm_buy_amount, cumm_sell_amount, final_prov_flag, remarks, reserve1, 
                        reserve2, reserve3, reserve4)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)`, [
                row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], 
                row[12], row[13], row[14], row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22], 
                row[23],row[24], row[25], row[26], row[27], row[28], row[29], row[30], row[31], row[32]
              ]);
            }
            //await insert_oblig_stag();
            resolve();
          } catch (error) {
            logError(error, req);
            reject(error);
          }
        })
        .on('error', (error) => {
            logError(error, req);
          reject(error);
        });
  
      stream.pipe(csvStream);
    });
  };
  
  
  // *************************************************************************
  // *************************************************************************
  // End Obligation file Upload/Process. 
  // *************************************************************************
  // *************************************************************************
  
  
  
  sauda_upload_router.get('/trade_view_log', async (req, res) => {
    try {
        const result = await pool.query(`SELECT uploaded_file file_name, TO_CHAR(uploaded_datetime, 'DD-MM-YYYY hh24:mi:ss') uplod_datetime, status, 'Anand' upld_by FROM CDBM.FILE_UPLOAD_HISTORY WHERE file_cd in ('CASH_SBOOK') order by uploaded_datetime desc`);
        res.json(result.rows);
    } catch (err) {
        //console.error(err.message);
        logError(err, req);
        res.status(500).send('Server error');
    }
  });
  
  sauda_upload_router.get('/clnt_not_exc_link_popup', async (req, res) => {
    try {
        const result = await pool.query(`select client_code, trade_no, err_message from CDBM.Detail_Error_Logs WHERE file_cd in ('CASH_SBOOK')`);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        logError(err, req);
        res.status(500).send('Server error');
    }
  });
  
  
  
  // //-----Helper function to process penality file--------
  sauda_upload_router.post('/insert-position-stag', async (req, res) => {
   // console.log('0');
    try {
      //const files = fs.readdirSync(csvDirectory).filter(file => file.endsWith('.txt'));
      const files = fs.readdirSync(csvDirectory).filter(file => file.endsWith('.csv'));
      
     // console.log('before for loop'); 
      for (const file of files) {
       // console.log('Processing file:', file);
        const filePath = path.join(csvDirectory, file);
      //  console.log('inside for loop Processing file:', filePath); 
        
        await processPositionFile(filePath);
        fs.unlinkSync(filePath);
      }
      console.log('CSV file/s processed successfully');
      res.json({ message: 'CSV file/s processed successfully' });
    } catch (error) {
      console.error('Error processing CSV files:', error);
      logError(error, req);
      res.status(500).json({ message: 'Error processing CSV files' });
    }
  });
  //------fuction insert into db penality file --------
  const processPositionFile = async (filePath) => {
    
    console.log('Reading the file and inserting into DB Position');
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
           // console.log(csvData[0]);
            for (const row of csvData) {
              await pool.query(`
                INSERT INTO cdbm.stag_position (
                  Sgmt,Src,Postion_Dt,Biz_Dt,Trad_Regn_Orgn,Clr_Mmb_Id,Trade_Mmb_id_code,Clnt_Tp,Clnt_Id ,Fin_Instrm_Tp,
                  ISIN, Inst_Symbol,Inst_Orig_Exp_Dt,Inst_Act_Exp_Dt,Strk_Price,Option_Tp ,Mkt_Size_QTY,
                  Brought_Fwd_Buy_Qty,Brought_Fwd_Buy_val,Brought_Fwd_Sell_Qty,Brought_Fwd_Sell_Qty,Opn_Buy_Tradg_Qty,
                  Opn_Buy_Tradg_Val,Opn_Sell_Tradg_Qty ,Opn_Sell_Tradg_Val ,Pre_Exrc_Assgnd_LngVal,Pre_Exrc_Assgnd_ShrtQty,
                  Pre_Exrc_Assgnd_ShrtVal,Exrcd_Qty,Pst_Exrc_Assgnd_LngQty,Pst_Exrc_Assgnd_LngVal,Pst_Exrc_Assgnd_ShrtQty,
                  Pst_Exrc_Assgnd_ShrtVal,Sttlement_Pric,Reference_Rate,Premium_Amt,Daly_Mrk_To_Mkt_Settlm_Val,Futrs_Fnl_Sttlm_Val,
                  Exrc_Assgnd_Val,Remarks,Reserved_1,Reserved_2,Reserved_3,Reserved_4)
                VALUES (
                  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                  $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,
                  $39,$40,$41,$42,$43,$44
                )
              `, 
              [
                row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], 
                row[12], row[13], row[14], row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22], 
                row[23],row[24], row[25], row[26], row[27], row[28], row[29], row[30], row[31], row[32], row[33],
                row[34], row[35],row[36],row[37], row[38], row[39], row[40], row[41], row[42], row[43]
                
                
              ]);
            }
            await execProcedure();
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
  
  
  
  
  /* sauda_upload_router.post('/execute-procedure', async (req, res) => {
    const jobId = uuidv4();
    res.status(202).json({ message: 'Processing started', jobId });
  
    try {
      await pool.query('CALL in_trade.my_procedure()');
      // Update job status to 'completed' in your database
    } catch (error) {
      console.error('Error executing procedure:', error);
      // Update job status to 'failed' in your database with error message
    }
  }); */
  
  
  sauda_upload_router.get('/job-status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    try {
      const result = await pool.query('SELECT status, error_message FROM cdbm.job_status WHERE job_id = $1', [jobId]);
      
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
        
      } else {
        res.status(404).json({ message: 'Job not found' });
       
      }
    } catch (error) {
      res.status(500).json({ message: 'Error fetching job status', error: error.message });
      
    }
  });

  sauda_upload_router.get('/auctiondata', async (req, res) => {
    try {
      // Updated SQL query without file_cd filter
      
      const query = `
        SELECT symbol, series,SUM(alloc_qty) AS total_alloc_qty,SUM(trade_qty) AS total_trade_qty
        FROM CDBM.AUCTION_TRADE_ERROR_HANDLING 
        GROUP BY symbol, series HAVING SUM(alloc_qty) = 0 ORDER BY symbol, series;`;
  
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  /*
   sauda_upload_router.get('/stag_auction', (req, res) => {
    const symbol = req.query.symbol; // Example query parameter
  
    console.log('symbol',symbol);
  
    const query = `SELECT * FROM cdbm.stag_cm_sb_ftp WHERE CLIENT_ID = 'NSE' AND  symbol = ?`;
    
    console.log('query >>>>>> ', query);

    query(query, [symbol], (error, results) => {
        if (error) {
            console.error('Error fetching data:', error);
            res.status(500).send('Server Error');
            return;
        }
        res.json(results);
        console.log("result",results);
    });
  });
  
*/

sauda_upload_router.get('/stag_auction', async (req, res) => {
  const symbol = req.query.symbol;

 // console.log('symbol:', symbol);

  const query = `SELECT client_id, SYMBOL, security_series, unq_trade_id, ord_ref_no, trade_date, price, trade_qty, inst_type ` + 
                ` FROM cdbm.stag_cm_sb_ftp WHERE CLIENT_ID = 'NSE' AND  symbol = $1`;

  try {
      // Perform the query
      const result = await pool.query(query, [symbol]);

      // Check if data is returned
      if (result.rows.length > 0) {
          res.json(result.rows);
         // console.log('result:', result.rows);
      } else {
          res.status(404).send('No data found');
      }
  } catch (err) {
     // console.error('Error fetching data:', err);
      res.status(500).send('Server Error');
  }
});

  sauda_upload_router.post('/saveAuctionDetails', async (req, res) => {
    const { auctionDetails, clientDetails } = req.body;
    // console.log("req.body",req.body);
  
    // Define a combined query to insert auction and client details

    //console.log('inside saveAuctionDetails <<<<<<');

    const queryInsertCombinedDetails = `
        INSERT INTO cdbm.auction_client_details (rec_no, client_id, company, exchange, branch, unq_trade_id, ord_ref_no,
            trade_date, price, security_series, client_code, sec, qty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
  
    // Define a query to update auction_trade_error_handling table
    const queryUpdateErrorHandling = `UPDATE cdbm.auction_trade_error_handling ` + 
                                    ` SET alloc_qty = $1 ` + 
                                     ` WHERE series = $2 AND symbol = $3 and trade_qty =$4`;
  
    try {
        await pool.query('BEGIN'); // Start transaction

        await pool.query(`delete from cdbm.auction_client_details;`);
  
        // Insert auction details for each client detail
        for (const clientDetail of clientDetails) {
            if (auctionDetails.length > 0) {
                const auctionDetail = auctionDetails[0]; // Get the first (and only) auction detail
                
                // Insert into auction_client_details
                await pool.query(queryInsertCombinedDetails, [
                    auctionDetail.recNo || null,
                    auctionDetail.client_id || null,
                    auctionDetail.company || null,
                    auctionDetail.exchange || null,
                    auctionDetail.branch || null,
                    auctionDetail.unq_trade_id || null,
                    auctionDetail.ord_ref_no || null,
                    auctionDetail.trade_date || null,
                    auctionDetail.price || null,
                    auctionDetail.security_series || null,
                    clientDetail.clientCode || null,
                    clientDetail.sec || null,
                    clientDetail.qty || null
                ]);
                
                // Update auction_trade_error_handling with alloc_qty
                for (const auction of auctionDetails) {
                  console.log('auction',auctionDetail);
                await pool.query(queryUpdateErrorHandling, [
                  auction.trade_qty || null,
                  auction.security_series || null,
                  clientDetail.sec || null,
                  auction.trade_qty || null
                ]);
                
              }
            }
        }

        /// checking if all auction qty and trade qty are allocated against clients or not. if all allocated then run DB procedure.
        
      const lv_count = await pool.query( `select count(1) cnt from (
        SELECT symbol, series,SUM(alloc_qty) AS total_alloc_qty,SUM(trade_qty) AS total_trade_qty
                FROM CDBM.AUCTION_TRADE_ERROR_HANDLING 
                GROUP BY symbol, series HAVING SUM(alloc_qty) = 0 ) 
        where total_alloc_qty != total_trade_qty;`);
     // console.log('lv_count ===>', lv_count);
      if (lv_count.rows[0].cnt === '0')
      {
        const lv_status = await pool.query('CALL cdbm.usp_Auction_Qty_Alloc($1)', [0]);
        if (lv_status.rows[0].p_status == '1')
        {
          res.json({message: '99' }); /// Allocation complete, upload and process the FTP file again
        }
        else
        {
          res.json({message: '95' }); /// allocation error
        }
      }
      else 
      {
        res.json({message: '90' });
      }

      await pool.query('COMMIT'); // Commit transaction
  
       // res.status(200).json({ message: 'Data saved successfully' });
    } catch (error) {
        await pool.query('ROLLBACK'); // Rollback transaction in case of error
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Error saving data' });
    }
  });
  

module.exports = sauda_upload_router;
