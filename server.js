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
const sauda_report_routes = require('./routes/sauda_report_routes');
const cashbank_master_routes = require('./routes/cashbank_master_routes');
const acct_master_routes = require('./routes/account_master_routes');
const booktype_mast_routes = require('./routes/booktype_mast_routes');
const common_routes = require('./routes/common_routes');
const client_master_routes = require('./routes/client_master_routes.js');
const brok_slab_routes = require('./routes/brok_slab_routes.js');
const client_link_slab_routes = require('./routes/client_link_slab_routes.js');
const doc_mapp_master_routes = require('./routes/doc_mapp_master_routes.js');
const family_group_routes = require('./routes/family_group_routes.js');
const client_group_routes = require('./routes/client_group_routes.js');
const mii_master_routes = require('./routes/mii_master_routes.js');

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
app.use(`${baseURL}/trial_balance`, trial_balance_routes);

//console.log('2 server.js *************************** baseURL', baseURL);
app.use(`${baseURL}`, sauda_upload_routes);
//app.use(`${baseURL}/sauda_metadata`, sauda_upload_routes);
//app.use(`${baseURL}/upload`, sauda_upload_routes);
app.use(`${baseURL}/insert-var-file-stag`, sauda_upload_routes);
app.use(`${baseURL}/insert-bhav-copy-stag`, sauda_upload_routes);
app.use(`${baseURL}/insert-settlement-master-stag`, sauda_upload_routes);
app.use(`${baseURL}/exec_db_Procedure`, sauda_upload_routes);
app.use(`${baseURL}/job-status/:jobId`, sauda_upload_routes);

// *************************************************************************************************
// Start : Commonly used API
// *************************************************************************************************

app.use(`${baseURL}`, common_routes);
app.use(`${baseURL}/bookType`, common_routes);
app.use(`${baseURL}/exchange`, common_routes);

// *************************************************************************************************
// End : Commonly used API
// *************************************************************************************************

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
app.use(`${baseURL}/bill_master`, payment_receipt_routes);
app.use(`${baseURL}/save_payment_voucher`, payment_receipt_routes);

app.use(`${baseURL}`, journal_voucher_routes);
//app.use(`${baseURL}/bookType`, journal_voucher_routes);
app.use(`${baseURL}/branches`, journal_voucher_routes);
app.use(`${baseURL}/Account`, journal_voucher_routes);
//app.use(`${baseURL}/searchVouchers`, journal_voucher_routes);
app.use(`${baseURL}/searchJv`, journal_voucher_routes);
app.use(`${baseURL}/searchEditVouchar`, journal_voucher_routes);
app.use(`${baseURL}/fin_company/:voucherDate`, journal_voucher_routes);
//app.use(`${baseURL}/exchange`, journal_voucher_routes);
app.use(`${baseURL}/save_journal_voucher`, journal_voucher_routes);

app.use(`${baseURL}`, dr_cr_note_routes);
app.use(`${baseURL}/branches`, dr_cr_note_routes);
app.use(`${baseURL}/Account`, dr_cr_note_routes);
// app.use(`${baseURL}/searchAccount`, dr_cr_note_routes);
// app.use(`${baseURL}/searchVouchers`, dr_cr_note_routes);
app.use(`${baseURL}/searchAccountDrCr`, dr_cr_note_routes);
app.use(`${baseURL}/searchVouchersDrCr`, dr_cr_note_routes);
app.use(`${baseURL}/searchEditVoucharDrCr`, dr_cr_note_routes);


app.use(`${baseURL}/fin_company/:voucherDate`, dr_cr_note_routes);
app.use(`${baseURL}/voucher`, dr_cr_note_routes);

app.use(`${baseURL}`, contra_voucher_routes);
app.use(`${baseURL}/last_upd_date_status`, contra_voucher_routes);
app.use(`${baseURL}/cash_bank_master`, contra_voucher_routes);
app.use(`${baseURL}/branches`, contra_voucher_routes);
//app.use(`${baseURL}/exchange`, contra_voucher_routes);
app.use(`${baseURL}/analyzercode`, contra_voucher_routes);
app.use(`${baseURL}/populatedetails`, contra_voucher_routes);
app.use(`${baseURL}/save_contra_voucher`, contra_voucher_routes);

app.use(`${baseURL}`, sauda_report_routes);
app.use(`${baseURL}/company_details`, sauda_report_routes);
app.use(`${baseURL}/exc_details`, sauda_report_routes);
app.use(`${baseURL}/contract_notes`, sauda_report_routes);


app.use(`${baseURL}`, cashbank_master_routes);
app.use(`${baseURL}/ddl_segment_master`, cashbank_master_routes);
app.use(`${baseURL}/ddl_activity_master`, cashbank_master_routes);
app.use(`${baseURL}/ddl_fin_group_level2`, cashbank_master_routes);
app.use(`${baseURL}/ddl_fin_group_level3`, cashbank_master_routes);
app.use(`${baseURL}/ddl_fin_group_level4`, cashbank_master_routes);
app.use(`${baseURL}/ddl_MI_master`, cashbank_master_routes);
app.use(`${baseURL}/save_cash_bank_master`, cashbank_master_routes);
app.use(`${baseURL}/search_bookType_frm_cash_bank_master`, cashbank_master_routes);
app.use(`${baseURL}/search_BankBranches`, cashbank_master_routes);
app.use(`${baseURL}/save_cheque_nos`, cashbank_master_routes);
app.use(`${baseURL}/get_cheque_nos`, cashbank_master_routes);
app.use(`${baseURL}/search_Cash_Bank_Master`, cashbank_master_routes);
app.use(`${baseURL}/search_CashBank_Master_ById`, cashbank_master_routes);
app.use(`${baseURL}/get_addresses`, cashbank_master_routes);
app.use(`${baseURL}/get_cont_persons`, cashbank_master_routes);
app.use(`${baseURL}/save_address_cont_persons`, cashbank_master_routes);

app.use(`${baseURL}`, acct_master_routes);
app.use(`${baseURL}/ddl_segment_master`, acct_master_routes);
app.use(`${baseURL}/ddl_activity_master`, acct_master_routes);
app.use(`${baseURL}/ddl_fin_group_level2`, acct_master_routes);
app.use(`${baseURL}/ddl_fin_group_level3`, acct_master_routes);
app.use(`${baseURL}/ddl_fin_group_level4`, acct_master_routes);
app.use(`${baseURL}/ddl_MI_master`, acct_master_routes);
app.use(`${baseURL}/save_account_master`, acct_master_routes);
app.use(`${baseURL}/search_account_master`, acct_master_routes);
app.use(`${baseURL}/search_Acc_Master_ById`, acct_master_routes);
app.use(`${baseURL}/search_BankBranches`, acct_master_routes);
app.use(`${baseURL}/save_cheque_nos`, acct_master_routes);
app.use(`${baseURL}/save_address_cont_persons`, acct_master_routes);
app.use(`${baseURL}/get_cont_persons`, acct_master_routes);
app.use(`${baseURL}/client_bank_ac_type`, acct_master_routes);
app.use(`${baseURL}/save_bank_details`, acct_master_routes);
app.use(`${baseURL}/get_bank_details`, acct_master_routes);

app.use(`${baseURL}`, booktype_mast_routes);
app.use(`${baseURL}/ddl_segment_master`, booktype_mast_routes);
app.use(`${baseURL}/ddl_activity_master`, booktype_mast_routes);
app.use(`${baseURL}/save_bookType`, booktype_mast_routes);
app.use(`${baseURL}/search_BookType`, booktype_mast_routes);

app.use(`${baseURL}`, client_master_routes);
app.use(`${baseURL}/search_client_grp`, client_master_routes);
app.use(`${baseURL}/search_family_grp`, client_master_routes);
app.use(`${baseURL}/search_depos_name`, client_master_routes);
app.use(`${baseURL}/nationality_list_comm_mas`, client_master_routes);
app.use(`${baseURL}/state_list_comm_mas`, client_master_routes);
app.use(`${baseURL}/ddl_subcatg`, client_master_routes);
app.use(`${baseURL}/get_doc_types`, client_master_routes);
app.use(`${baseURL}/get_doc_names`, client_master_routes);
app.use(`${baseURL}/get_sub_catg_mii_dets`, client_master_routes);
app.use(`${baseURL}/get_subdealer_ddl`, client_master_routes);
app.use(`${baseURL}/client-Occupation`, client_master_routes);
app.use(`${baseURL}/client-designation`, client_master_routes);
app.use(`${baseURL}/client-prefix`, client_master_routes);
app.use(`${baseURL}/client-gender`, client_master_routes);
app.use(`${baseURL}/client-marital_status`, client_master_routes);
app.use(`${baseURL}/client-bank_ac_type`, client_master_routes);
app.use(`${baseURL}/client-proof_type`, client_master_routes);
app.use(`${baseURL}/client-politic_exposed`, client_master_routes);
app.use(`${baseURL}/searchBrokCode`, client_master_routes);
app.use(`${baseURL}/ddl_catg_doc_mapp`, client_master_routes);
app.use(`${baseURL}/ddl_sub_catg_doc_mapp`, client_master_routes);
app.use(`${baseURL}/ddl_doc_names`, client_master_routes);
app.use(`${baseURL}/mii_names_ddl`, client_master_routes);
app.use(`${baseURL}/segments_ddl`, client_master_routes);
app.use(`${baseURL}/dealer_ddl`, client_master_routes);
app.use(`${baseURL}/searchPAN`, client_master_routes);
app.use(`${baseURL}/ClientAllDATA`, client_master_routes);

app.use(`${baseURL}`, brok_slab_routes);
app.use(`${baseURL}/slab-settlementTye`, brok_slab_routes);
app.use(`${baseURL}/cash_bill_slab_master`, brok_slab_routes);
app.use(`${baseURL}/save_normal_slab`, brok_slab_routes);
app.use(`${baseURL}/get_cash_bill_normal_slab/:slab_id`, brok_slab_routes);
app.use(`${baseURL}/search_cash_bill_slab/:slab_id`, brok_slab_routes);
app.use(`${baseURL}/CASH_BILL_DEL_RANGE_MASTER`, brok_slab_routes);
app.use(`${baseURL}/save_genrange_slab`, brok_slab_routes);
app.use(`${baseURL}/cash_bill_Genrange_slab`, brok_slab_routes);
app.use(`${baseURL}/get_gen_ranges_on_select`, brok_slab_routes);
app.use(`${baseURL}/get_del_ranges_on_select`, brok_slab_routes);
app.use(`${baseURL}/cash_bill_Delrange_slab`, brok_slab_routes);
app.use(`${baseURL}/save_Delrange_slab`, brok_slab_routes);
app.use(`${baseURL}/save_scrip_slab`, brok_slab_routes);
app.use(`${baseURL}/cash_bill_scrip_slab/:slab_id`, brok_slab_routes);
app.use(`${baseURL}/searchScrip`, brok_slab_routes);
app.use(`${baseURL}/rangeNamesNormal`, brok_slab_routes);
app.use(`${baseURL}/rangeNamesDel`, brok_slab_routes);

app.use(`${baseURL}`, client_link_slab_routes);
app.use(`${baseURL}/save_cli_link_slab`, client_link_slab_routes);
app.use(`${baseURL}/save_cli_slab_attach`, client_link_slab_routes);
app.use(`${baseURL}/get_client_slab_attach/:clientcd`, client_link_slab_routes);
app.use(`${baseURL}/get_client_name`, client_link_slab_routes);
app.use(`${baseURL}/get_client_link_slab/:client_cd`, client_link_slab_routes);
app.use(`${baseURL}/ddl_segment_master`, client_link_slab_routes);
app.use(`${baseURL}/ddl_brok_slabs`, client_link_slab_routes);
app.use(`${baseURL}/ddl_activity_master`, client_link_slab_routes);
app.use(`${baseURL}/exchange_ddl`, client_link_slab_routes);
app.use(`${baseURL}/search_cliName_frm_client_master`, client_link_slab_routes);

app.use(`${baseURL}`, doc_mapp_master_routes);
app.use(`${baseURL}/save_doc_mapp_master`, doc_mapp_master_routes);
app.use(`${baseURL}/ddl_catg_doc_mapp`, doc_mapp_master_routes);
app.use(`${baseURL}/ddl_sub_catg_doc_mapp`, doc_mapp_master_routes);
app.use(`${baseURL}/search_doc_mapp_master`, doc_mapp_master_routes);
app.use(`${baseURL}/search_doc_mapp_Master_ById`, doc_mapp_master_routes);
app.use(`${baseURL}/ddl_doc_names`, doc_mapp_master_routes);

app.use(`${baseURL}`, family_group_routes);
app.use(`${baseURL}/save_family_grp`, family_group_routes);
app.use(`${baseURL}/search_family_grp`, family_group_routes);
app.use(`${baseURL}/search_family_grp_ById`, family_group_routes);
app.use(`${baseURL}/get_client_name`, family_group_routes);
app.use(`${baseURL}/search_cliName_frm_client_master`, family_group_routes);
app.use(`${baseURL}/upd_client_link`, family_group_routes);
app.use(`${baseURL}/upd_client_links`, family_group_routes);
app.use(`${baseURL}/delete_client_link`, family_group_routes);
app.use(`${baseURL}/delete_client_links`, family_group_routes);
app.use(`${baseURL}/get_linked_client`, family_group_routes);

app.use(`${baseURL}`, client_group_routes);
app.use(`${baseURL}/save_cli_grp`, client_group_routes);
app.use(`${baseURL}/search_client_grp`, client_group_routes);
app.use(`${baseURL}/search_cli_grp_ById`, client_group_routes);
app.use(`${baseURL}/get_client_name`, client_group_routes);
app.use(`${baseURL}/search_cliName_frm_client_master`, client_group_routes);
app.use(`${baseURL}/upd_client_link`, client_group_routes);
app.use(`${baseURL}/upd_client_links`, client_group_routes);
app.use(`${baseURL}/delete_client_link`, client_group_routes);
app.use(`${baseURL}/delete_client_links`, client_group_routes);
app.use(`${baseURL}/get_linked_client`, client_group_routes);

app.use(`${baseURL}`, mii_master_routes);
app.use(`${baseURL}/ddl_mii_bank_types`, mii_master_routes);
app.use(`${baseURL}/ddl_cb_book_types`, mii_master_routes);
app.use(`${baseURL}/get_bankname_accountno`, mii_master_routes);
app.use(`${baseURL}/save_mii_master`, mii_master_routes);
app.use(`${baseURL}/ddl_mii_master`, mii_master_routes);
app.use(`${baseURL}/ddl_demat_mii_master`, mii_master_routes);
app.use(`${baseURL}/ddl_mii_cc_id`, mii_master_routes);
app.use(`${baseURL}/ddl_segment_master`, mii_master_routes);
app.use(`${baseURL}/search_Mii_Master`, mii_master_routes);
app.use(`${baseURL}/get_MII_bank_details`, mii_master_routes);
app.use(`${baseURL}/search_Mii_Master_ById`, mii_master_routes);
app.use(`${baseURL}/save_MII_Bank_Details`, mii_master_routes);
app.use(`${baseURL}/save_MII_Deemat_Details`, mii_master_routes);
app.use(`${baseURL}/get_MII_deemat_details`, mii_master_routes);
app.use(`${baseURL}/save_address_cont_persons`, mii_master_routes);
app.use(`${baseURL}/get_addresses`, mii_master_routes);
app.use(`${baseURL}/get_cont_persons`, mii_master_routes);
app.use(`${baseURL}/ddl_activity_master`, mii_master_routes);
app.use(`${baseURL}/ddl_fin_group_level2`, mii_master_routes);
app.use(`${baseURL}/ddl_fin_group_level3`, mii_master_routes);
app.use(`${baseURL}/ddl_fin_group_level4`, mii_master_routes);
app.use(`${baseURL}/ddl_MI_master`, mii_master_routes);


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
