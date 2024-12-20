const express = require('express');
const sauda_report_router = express.Router();
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
const nodemailer = require('nodemailer');

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


/*
1. 
The company name, address and other company details are pronted from here.
*/

sauda_report_router.get('/company_details', async (req, res) => {
    try {
  
      let query = `select name comp_name, addr1, addr2, addr3, city, pin, phone, fax, email, url, '' dtl1, '' dtl2, '' dtl3, '' dtl4, '' dtl5 
                     from cdbm.company_config where cmp_cd = 1;`;
  
        const result = await pool.query(query);

       // console.log('company_details result.rows --> ', result.rows);
  
        res.json(result.rows);
  
    } catch (error) {
        console.log('error  company_details >>>>>', error);
        logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
  /*
  2. 
  The table shown in the excel column/row J16 - P16 and J29 to P29 will be printed from this api.
  */
  sauda_report_router.get('/exc_details', async (req, res) => {
    try {
  
      let query = `select exc.mii_short_name exc_name, std_val segment, cc.sebi_regisn_no clearing_no, '001' trading_no, '0123' CMBP_ID, exc.sebi_regisn_no Sebi_reg
                    from cdbm.mii_master exc join cdbm.segment_master s on s.seg_code = exc.seg_code left join cdbm.mii_master cc on cc.mii_id = exc.mii_cc_id
                   where exc.mii_catg='EXC' order by 1;`;

      //  console.log('exc_details result.rows --> ', result.rows);
  
        const result = await pool.query(query);
       // console.log('result --> ', result.rows);
        res.json(result.rows);
  
    } catch (error) {
        console.log('error exc_details >>>>>', error);
        logError(error, req);
        res.status(500).send(error.message);
    }
  });
  
/*
Main Contract Note Data will be printed from below api. The below API will return one main query under main there are two objects for security and GST data
*/  
  sauda_report_router.get('/contract_notes', async (req, res) => {
    try {
        
      const { p_transaction_date } = req.query;

      let query = `SELECT DISTINCT trd_client_cd client_cd, client_full_name || ' (' || cm.client_cd || ')' client_name , 
                          Corres_Addr_1, Corres_Addr_2, Corres_Addr_3, Corres_City, cm.pan pan_no, contract_no cont_note_no, 
                          to_char(TRD_ENTER_DATE_TIME, 'DD/MM/YYYY') trade_date, int_mkt_type, trd_settle_no, email_id email_id
                   FROM cdbm.cash_sauda_book csb 
                   JOIN cdbm.ClientMaster cm ON cm.client_cd = csb.trd_client_cd
                   WHERE TO_DATE(CAST(TRD_ENTER_DATE_TIME AS VARCHAR(10)), 'YYYY-MM-DD') = TO_DATE('` + p_transaction_date + `', 'DD/MM/YYYY')
                   ORDER BY 1;`;
  
      const contractNotesResult = await pool.query(query);
  
      // Fetch data for security_summary for each client (if needed)
      const contractNoteAndDetails = await Promise.all(contractNotesResult.rows.map(async (contractNote) => {
        const { client_cd, int_mkt_type, trd_settle_no } = contractNote;
  
        /// Start Security Summary
        const securitySummaryQuery = `SELECT isin, scrip_cd, series, buy_qty, 
                                        cast(buy_value / greatest(buy_qty, 1) as numeric(12,3)) buy_wap,  
                                        cast(((buy_value - nse_buy_value) / greatest(buy_qty, 1)) as numeric(8,4)) Buy_Brok_Per_Share,
                                        cast(nse_buy_value / greatest(buy_qty, 1) as numeric(12,3)) buy_wap_aft_brok, 
                                        nse_buy_value tot_buy_aft_brok, sale_qty, 
                                        cast(sale_value / greatest(sale_qty, 1) as numeric(12,3)) sale_wap, 
                                        cast(((nse_sale_value - sale_value) / greatest(sale_qty, 1)) as numeric(8,4)) Sale_Brok_Per_Share,
                                        cast(nse_sale_value / greatest(sale_qty, 1) as numeric(12,3)) sale_wap_aft_brok,  
                                        nse_sale_value tot_sale_aft_brok, abs(buy_qty - sale_qty) net_qty, 
                                        abs(nse_buy_value - nse_sale_value) net_oblig
                                   FROM cdbm.cash_net_position_client  
                                  WHERE client_cd = $1 and int_mkt_type = $2 and settle_no = $3
                                  order by ISIN;`;
  
                                  //AND TO_DATE(CAST(POSITION_DATE AS VARCHAR(10)), 'YYYY-MM-DD') = TO_DATE($4, 'DD-MM-YYYY') , p_transaction_date
        const securitySummaryResult = await pool.query(securitySummaryQuery, [client_cd, int_mkt_type, trd_settle_no]);
        
        /// End Security Summary
  
        //// Start GST Details
        const GSTQuery = `SELECT net.isin, net.scrip_cd, net.series, abs(nse_buy_value - nse_sale_value) net_oblig,
       csb.STT_Chrg, csb.Stamp_Duty, csb.SEBI_Turnover, 0 taxable_val, csb.Other_Chrg, csb.brok_sgst,
       csb.brok_cgst, csb.brok_igst, csb.brok_sgst
                    FROM CDBM.CASH_NET_POSITION_CLIENT net 
                    JOIN (select trd_client_cd, trd_sec_cd, trd_series, trd_settle_no,
                                SUM(stt_tax + coalesce(n_stt_round_off, 0)) STT_Chrg,
                                SUM(trd_stamp_duty + coalesce(n_sd_round_off, 0)) Stamp_Duty,    
                                SUM(sebi_turn_over) SEBI_Turnover, 0 taxable_val, SUM(other_chrg) Other_Chrg, SUM(n_brok_sgst) brok_sgst,
                                SUM(n_brok_cgst) brok_cgst, SUM(n_brok_igst) brok_igst, SUM(n_brok_ugst) brok_ugst
                           from cdbm.cash_sauda_book
                          where trd_client_cd = $1 and trd_settle_no = $3
                          group by trd_client_cd, trd_sec_cd, trd_series, trd_settle_no) csb 
                      ON csb.trd_client_cd = net.client_cd
                       AND csb.trd_sec_cd = net.scrip_cd AND csb.trd_series = net.series 
                 WHERE net.CLIENT_CD = $1 and net.int_mkt_type = $2 and settle_no = $3 order by ISIN;`
        /*
          AND TO_DATE(CAST(csb.TRD_ENTER_DATE_TIME AS VARCHAR(10)), 'YYYY/MM/DD') = TO_DATE(CAST(net.POSITION_DATE AS VARCHAR(10)), 'YYYY/MM/DD')
        const GSTQuery = `SELECT net.isin, net.scrip_cd, net.series, SUM(abs(nse_buy_value - nse_sale_value)) net_oblig,
                      SUM(stt_tax + coalesce(n_stt_round_off, 0)) STT_Chrg, SUM(trd_stamp_duty + coalesce(n_sd_round_off, 0)) Stamp_Duty,
                      SUM(sebi_turn_over) SEBI_Turnover, 0 taxable_val, SUM(other_chrg) Other_Chrg, SUM(n_brok_sgst) brok_sgst,
                      SUM(n_brok_cgst) brok_cgst, SUM(n_brok_igst) brok_igst, SUM(n_brok_ugst) brok_sgst
                    FROM CDBM.CASH_NET_POSITION_CLIENT net JOIN cdbm.cash_sauda_book csb ON csb.trd_client_cd = net.client_cd 
                       AND csb.trd_sec_cd = net.scrip_cd AND csb.trd_series = net.series 
                       AND TO_DATE(CAST(csb.TRD_ENTER_DATE_TIME AS VARCHAR(10)), 'YYYY/MM/DD') = TO_DATE(CAST(net.POSITION_DATE AS VARCHAR(10)), 'YYYY/MM/DD')
                 WHERE net.CLIENT_CD = $1  and net.int_mkt_type = $2 and settle_no = $3 ` + 
                 ` GROUP BY net.isin, net.scrip_cd, net.series Order by net.isin;`;*/
  
        const GSTSummResult = await pool.query(GSTQuery, [client_cd, int_mkt_type, trd_settle_no]);
        /// End GST Details
  
        // Start Detailed Rows
        const DetailQuery = ` SELECT isin, trd_sec_cd, trd_series, ord_no, to_char(cast(ord_ent_mod_dt_time as timestamp), 'HH:MI:SS') order_time,
                        trd_no, to_char(cast(trd_enter_date_time as timestamp), 'HH:MI:SS') trade_time,
                        case when trd_buy_sell = '1' then 'B' 
                             when trd_buy_sell = '2' then 'S' else ''
                          end buy_sell,
                        case when trd_buy_sell = '1' then trd_qty
                             when trd_buy_sell = '2' then trd_qty * -1
                        end trd_qty, round(cast((trd_price / trd_qty) as numeric(13,4)), 2) gross_rate,
                        coalesce(trd_br_amount, 0) + coalesce(delivery_brokerage, 0) brok_per_unit,
                        case when trd_buy_sell = '1' then 
                               round(cast((trd_price / trd_qty) as numeric(13,4)), 2) + coalesce(trd_br_amount, 0) + coalesce(delivery_brokerage, 0)
                             when trd_buy_sell = '2' then
                                round(cast((trd_price / trd_qty) as numeric(13,4)), 2) - coalesce(trd_br_amount, 0) + coalesce(delivery_brokerage, 0)
                             end net_rate,
                        case when trd_buy_sell = '1' then 
                             (round(cast((trd_price / trd_qty) as numeric(13,4)), 2) + coalesce(trd_br_amount, 0) + coalesce(delivery_brokerage, 0)) * trd_qty
                            when trd_buy_sell = '2' then
                            (round(cast((trd_price / trd_qty) as numeric(13,4)), 2) - coalesce(trd_br_amount, 0) + coalesce(delivery_brokerage, 0)) * (trd_qty * -1)
                        end net_rate 
                     FROM CDBM.CASH_SAUDA_BOOK CSB
                  WHERE TRD_CLIENT_CD =  $1  and int_mkt_type = $2 and trd_settle_no = $3 ` + 
  //                ` AND TO_DATE(CAST(TRD_ENTER_DATE_TIME AS VARCHAR(10)), 'YYYY/MM/DD') = TO_DATE('` + p_transaction_date + `', 'DD-MM-YYYY') 
                  ` order by order_time;`;
  
        const DetailResult = await pool.query(DetailQuery, [client_cd, int_mkt_type, trd_settle_no]);
  
        // End Detailed Rows
  
        // Attach security summary as a child object to each contract note
        contractNote.security_summary = securitySummaryResult.rows;
        contractNote.GST_summary = GSTSummResult.rows;
        contractNote.Detailed = DetailResult.rows;
  
        return contractNote;
      }));
  
      // Send the response with contract notes and security summary data
      //console.log('contractNoteAndDetails -> ', contractNoteAndDetails);
      res.json(contractNoteAndDetails);
  
    } catch (error) {
      console.log('error contract_notes >>>>>', error);
      logError(error, req);
      res.status(500).send(error.message);
    }
  });

/// ******************************************************
///     Start Contract Note Email Part 15/12/2025
/// ******************************************************

  //    send Mail-------->>>>>
const app = express();

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, 'uploads');

const upload = multer({ dest: uploadDir });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Endpoint to send emails with attachments
const PdfReader = require("pdfreader").PdfReader; // Import PdfReader
//const fs = require('fs');

// Helper function to extract email from PDF
const extractEmailFromPDF = (filePath) => {
  return new Promise((resolve, reject) => {
      const pdfText = [];
      const reader = new PdfReader();

      reader.parseFileItems(filePath, (err, item) => {
          if (err) {
              console.error("Error reading PDF:", err);
              reject(err);
          } else if (!item) {
              // End of file, process the collected text
             // console.log("Extracted text:", pdfText);

              const fullText = pdfText.join(" ");

              // Regular expression to find an email address
              const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
              const matches = fullText.match(emailRegex);

              if (matches && matches.length > 0) {
                  // Take the first email found
                  const email = matches[0];
                  console.log("Extracted email:", email);
                  resolve(email);
              } else {
                  reject(new Error("No email found in PDF."));
              }
          } else if (item.text) {
              // Collect text from PDF
              pdfText.push(item.text.trim());
          }
      });
  });
};

sauda_report_router.post('/sendEmails_Contr_Notes', upload.array('files'), async (req, res) => {
  try {
      const files = req.files;

      if (!files || files.length === 0) {
          return res.status(400).json({ message: 'No files uploaded.' });
      }
      
      // Configure the transporter
      const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
              user: 'fahad.mohd@achyutlabs.com',
              pass: 'bjgc twxi czkp pary', // Use an App Password if 2FA is enabled
          },
      });

      // Process each file asynchronously with email extraction
      const results = await Promise.allSettled(
          files.map(async (file) => {
              //console.log("Processing file:", file);
              //console.log('file.originalname ==> ', file.originalname);
              var user_Id = 1;
              var lv_pdf_name = file.originalname;
              var lv_valid_email = 'T';
              var log_msg ='';
              const lv_split_str =  lv_pdf_name.split('_');
              //console.log('lv_split_str ==> ', lv_split_str[3]);

              const result = await pool.query('select email_id from cdbm.clientmaster where client_cd = $1', [lv_split_str[3]]);

              if (result.rows.length === 0) {
                log_msg = ('Client not found in client master, ', lv_split_str[3]);
                lv_valid_email = 'F';
              }

              const email_to = result.rows[0].email_id;

              if (!email_to || email_to.length === 0){
                log_msg = ('eMail not available for , ', lv_split_str[3]);
                lv_valid_email = 'F';
              }

              // Extract email from the PDF
              //temporarily by anis const email = await extractEmailFromPDF(file.path);
              
              // console.log("Extracted email:", email);
           // console.log('email_to ==> ', email_to);

            if (lv_valid_email === 'T') {
              const attachments = {
                filename: file.originalname,
                path: file.path,
              };
              
              const mailOptions = {
                from: 'fahad.mohd@achyutlabs.com',
                to: email_to, // Dynamic email from PDF
                //to: 'anza.soft.tech@gmail.com',
                subject: 'Contract Note No. ' + lv_split_str[2],
                text: `Dear Sir/Madam, `+ String.fromCharCode(13) +
                      ` ` + String.fromCharCode(13) +
                      `   Please find attached the Constract Note for Settlement No. ` + lv_split_str[4] + String.fromCharCode(13) +
                      + lv_split_str[4] + String.fromCharCode(13) +
                      ` Thanks & Regards, ` + String.fromCharCode(13) +
                      ' Sodhani Security Ltd.' + String.fromCharCode(13),
                attachments,
              };
              //console.log('mailOptions ==> ', mailOptions);
              // Send the email
              try {
                const info = await transporter.sendMail(mailOptions);
                await pool.query(`insert into cdbm.email_log (document_name, file_name, client_cd, detail, email_id, status, sent_user_id, sent_datetime) 
                values ($1, $2, $3, $4, $5, $6, $7, clock_timestamp()) `,
                  ['Contract_Note', lv_pdf_name, lv_split_str[3], 'Contract Note sent to client', email_to, 'Sent', user_Id]);
              }
              catch (error) {
                await pool.query(`insert into cdbm.email_log (document_name, file_name, client_cd, detail, email_id, status, sent_user_id, sent_datetime) 
                  values ($1, $2, $3, $4, $5, $6, $7, clock_timestamp()) `,
                 ['Contract_Note', lv_pdf_name, lv_split_str[3], (error).toString().substring(0, 99), email_to, 'Error', user_Id ]);
              }
            }
            else {
              await pool.query(`insert into cdbm.email_log (document_name, file_name, client_cd, detail, email_id, status, sent_user_id, sent_datetime) 
                                  values ($1, $2, $3, $4, $5, $6, $7, clock_timestamp()) `,
                                 ['Contract_Note', lv_pdf_name, log_msg, lv_split_str[3], email_to, 'Failed', user_Id ]);
            }

             // console.log("Email sent successfully:", info.response);

              // Delete the file after sending the email
              await fs.promises.unlink(file.path); // Use promises version for async handling
              //console.log(`Deleted file: ${file.path}`);

              return { status: 'fulfilled', file: file.originalname };
          })
      );

      // Handle results and log errors for failed files
      const errors = results
          .filter((result) => result.status === 'rejected')
          .map((error) => ({
              file: error.reason.file,
              message: error.reason.message,
          }));

      if (errors.length > 0) {
          console.error("Some files failed to process:", errors);
          await pool.query(`insert into cdbm.email_log (document_name, detail, status, sent_user_id, sent_datetime) 
                                  values ($1, $2, $3, $4, clock_timestamp()) `,
                                 ['Contract_Note',  (errors).toString().substring(0, 99),  'Other Error', user_Id ]);
          return res.status(207).json({
              message: 'Some emails failed to send.',
              errors,
          });
      }

      res.status(200).json({ message: 'All emails sent successfully!' });
  } catch (error) {
      console.error("Error in /sendEmails route:", error);
      res.status(500).json({ message: 'Failed to send emails.', error: error.message });
  }
});

/// ******************************************************
///     End Contract Note Email Part 15/12/2025
/// ******************************************************


  module.exports = sauda_report_router;
