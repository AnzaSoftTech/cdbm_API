const express = require('express');
const errorLogger = require('./error-logger');
const user_routes = require('./routes/user_routes');
const sauda_book_routes = require('./routes/sauda_book_routes');
const sauda_upload_routes = require('./routes/sauda_upload_routes');
const master_upload_routes = require('./routes/master_upload_routes');
const cash_net_routes = require('./routes/cash_net_routes');
const ledger_routes = require('./routes/ledger_routes');
const trial_balance_routes = require('./routes/trial_balance_routes');
const payment_receipt_routes = require('./routes/payment_receipt_routes');
const journal_voucher_routes = require('./routes/journal_voucher_routes');
const dr_cr_note_routes = require('./routes/dr_cr_note_routes.js');
const contra_voucher_routes = require('./routes/contra_voucher_routes');

const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');


// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(cors());

const baseURL = process.env.BASE_URL;

const port = process.env.PORT;
const physicalPath = process.env.PHYSICAL_PATH || 'D://Sodhani//Main_API//cdbm.api';

console.log('1 server.js baseURL', baseURL);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Utility function to get caller details
const getCallerInfo = () => {
    const stack = new Error().stack.split('\n')[3].trim();
    const match = stack.match(/at (.+?) \((.+):(\d+):(\d+)\)/);

    if (match) {
        return {
            functionName: match[1],
            file: match[2],
            lineNumber: match[3],
            columnNumber: match[4]
        };
    }

    return {};
};

// Middleware to log errors
const logError = (error, req, res, next) => {
    const { functionName, file, lineNumber, columnNumber } = getCallerInfo();
    const logEntry = {
        message: error.message,
        functionName,
        file,
        lineNumber,
        columnNumber,
        query: req.query,
        data: req.body
    };

    logger.error(JSON.stringify(logEntry));
    res.status(500).send('Internal Server Error');
};


/* // Example route
app.get(`${baseURL}/example`, (req, res) => {
  res.send('Hello World!');
}); */

// Serve static files from the physical path
//app.use(`${baseURL}/static`, express.static(physicalPath));

// Error handling middleware
app.use((err, req, res, next) => {
  logError(err, req);
  res.status(500).json({ message: 'Internal Server Error' });
});


app.use(`${baseURL}`, user_routes);
app.use(`${baseURL}/example`, user_routes);
app.use(`${baseURL}/login`, user_routes);
app.use(`${baseURL}/logout`, user_routes);
app.use(`${baseURL}/menu`, user_routes);
app.use(`${baseURL}/projects`, user_routes);

app.use(`${baseURL}`, sauda_book_routes);
app.use(`${baseURL}/example2`, sauda_book_routes);
app.use(`${baseURL}/sauda_book`, sauda_book_routes);
app.use(`${baseURL}/scrip/:id`, sauda_book_routes);
app.use(`${baseURL}/client/:id`, sauda_book_routes);
app.use(`${baseURL}/searchclient`, sauda_book_routes);
app.use(`${baseURL}/searchScrip`, sauda_book_routes);
app.use(`${baseURL}/branches`, sauda_book_routes);
app.use(`${baseURL}/settlement_type`, user_routes);
app.use(`${baseURL}/auctiondata`, user_routes);
app.use(`${baseURL}/stag_auction`, user_routes);
app.use(`${baseURL}/saveAuctionDetails`, user_routes);

app.use(`${baseURL}`, cash_net_routes);
app.use(`${baseURL}/client`, cash_net_routes);
app.use(`${baseURL}/branches`, cash_net_routes);
app.use(`${baseURL}/settlement_type`, cash_net_routes);
app.use(`${baseURL}/client/:id`, cash_net_routes);
app.use(`${baseURL}/scrip/:id`, cash_net_routes);
app.use(`${baseURL}/searchclient`, cash_net_routes);
app.use(`${baseURL}/searchScrip`, cash_net_routes);
app.use(`${baseURL}/client_summary`, cash_net_routes);
app.use(`${baseURL}/client_net_position`, cash_net_routes);


app.use(`${baseURL}`, ledger_routes);
app.use(`${baseURL}/ledger`, ledger_routes);

app.use(`${baseURL}`, trial_balance_routes);
app.use(`${baseURL}/bal`, trial_balance_routes);

//console.log('2 server.js *************************** baseURL', baseURL);
app.use(`${baseURL}`, sauda_upload_routes);
//app.use(`${baseURL}/sauda_metadata`, sauda_upload_routes);
//app.use(`${baseURL}/upload`, sauda_upload_routes);
app.use(`${baseURL}/insert-var-file-stag`, sauda_upload_routes);
app.use(`${baseURL}/insert-bhav-copy-stag`, sauda_upload_routes);
app.use(`${baseURL}/insert-settlement-master-stag`, sauda_upload_routes);
app.use(`${baseURL}/exec_db_Procedure`, sauda_upload_routes);
app.use(`${baseURL}/job-status/:jobId`, sauda_upload_routes);


app.use(`${baseURL}`, master_upload_routes);
app.use(`${baseURL}/sauda_metadata`, master_upload_routes);
app.use(`${baseURL}/MasterFileupload`, master_upload_routes);
app.use(`${baseURL}/insert-var-file-stag`, master_upload_routes);
app.use(`${baseURL}/insert-bhav-copy-stag`, master_upload_routes);
app.use(`${baseURL}/insert-settlement-master-stag`, master_upload_routes);
app.use(`${baseURL}/exec_db_Procedure`, master_upload_routes);
app.use(`${baseURL}/job-status/:jobId`, master_upload_routes);

app.use(`${baseURL}`, payment_receipt_routes);
app.use(`${baseURL}/cash_bank_master`, payment_receipt_routes);
app.use(`${baseURL}/populatedetails`, payment_receipt_routes);
app.use(`${baseURL}/NSE_Bank_AnalyzerCode`, payment_receipt_routes);
app.use(`${baseURL}/NSE_Client_AnalyzerCode`, payment_receipt_routes);
app.use(`${baseURL}/SSL_AnalyzerCode`, payment_receipt_routes);
app.use(`${baseURL}/branches/:voucherDate`, payment_receipt_routes);
app.use(`${baseURL}/Account`, payment_receipt_routes);
app.use(`${baseURL}/searchAccount`, payment_receipt_routes);
app.use(`${baseURL}/searchVouchers`, payment_receipt_routes);
app.use(`${baseURL}/fin_company/:voucherDate`, payment_receipt_routes);
app.use(`${baseURL}/exchange`, payment_receipt_routes);
app.use(`${baseURL}/bill_master`, payment_receipt_routes);
app.use(`${baseURL}/voucher`, payment_receipt_routes);

app.use(`${baseURL}`, journal_voucher_routes);
app.use(`${baseURL}/bookType`, journal_voucher_routes);
app.use(`${baseURL}/branches`, journal_voucher_routes);
app.use(`${baseURL}/Account`, journal_voucher_routes);
app.use(`${baseURL}/searchVouchers`, journal_voucher_routes);
app.use(`${baseURL}/searchEditVouchar`, journal_voucher_routes);
app.use(`${baseURL}/fin_company/:voucherDate`, journal_voucher_routes);
app.use(`${baseURL}/exchange`, journal_voucher_routes);
app.use(`${baseURL}/save_journal_voucher`, journal_voucher_routes);

app.use(`${baseURL}`, dr_cr_note_routes);
app.use(`${baseURL}/branches`, dr_cr_note_routes);
app.use(`${baseURL}/Account`, dr_cr_note_routes);
app.use(`${baseURL}/searchAccount`, dr_cr_note_routes);
app.use(`${baseURL}/searchVouchers`, dr_cr_note_routes);
app.use(`${baseURL}/fin_company/:voucherDate`, dr_cr_note_routes);
app.use(`${baseURL}/voucher`, dr_cr_note_routes);

app.use(`${baseURL}`, contra_voucher_routes);
app.use(`${baseURL}/last_upd_date_status`, contra_voucher_routes);
app.use(`${baseURL}/cash_bank_master`, contra_voucher_routes);
app.use(`${baseURL}/branches`, contra_voucher_routes);
app.use(`${baseURL}/exchange`, contra_voucher_routes);
app.use(`${baseURL}/analyzercode`, contra_voucher_routes);
app.use(`${baseURL}/populatedetails`, contra_voucher_routes);
app.use(`${baseURL}/save_contra_voucher`, contra_voucher_routes);


//app.use('${baseURL}', routes);
// Routes
//app.use('/api/example', routes);
//app.use('/api/userexample', require('./routes/userexample'));

//const PORT = process.env.PORT || 3001;
// Use the error logging middleware
//app.use(errorLogger);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Base URL: ${baseURL}`);
  console.log(`Serving static files from: ${physicalPath}`);
});
