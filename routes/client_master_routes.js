const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const client_master_routes = express.Router();
const port = 3001;


// PostgreSQL pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

app.use(cors());
app.use(bodyParser.json());

client_master_routes.get('/search_client_grp', async (req, res) => {
    let query = `SELECT cli_grp_cd, cli_grp_name ` +
        ` FROM cdbm.client_grp ;`;
    // `  and UPPER(bank_name) like UPPER('%` + p_bank_name + `%') and bank_acc_no like '%` + p_acct_no + `%';`;

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

client_master_routes.get('/search_family_grp', async (req, res) => {
    let query = `SELECT fam_grp_cd, fam_grp_name ` +
        ` FROM cdbm.family_grp ;`;
    // `  and UPPER(bank_name) like UPPER('%` + p_bank_name + `%') and bank_acc_no like '%` + p_acct_no + `%';`;

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

client_master_routes.get('/search_depos_name', async (req, res) => {
    let query = ` SELECT mii_id, mii_short_name FROM cdbm.mii_master WHERE mii_catg='DEPOS'; `;

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

client_master_routes.get('/nationality_list_comm_mas', async (req, res) => {
    let query = ` SELECT COMM_ID, DESCRIPTION, NSE_VAL FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'COUNTRY' `;

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

client_master_routes.get('/state_list_comm_mas', async (req, res) => {
    let query = ` SELECT COMM_ID, DESCRIPTION, NSE_VAL FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'STATE' `;

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

client_master_routes.get('/ddl_subcatg', async (req, res) => {
    const { p_catg } = req.query;
    try {
        let result;
        if (p_catg === '') {
            result = await pool.query(`SELECT COMM_ID, DESCRIPTION FROM CDBM.COMMON_MASTER
          WHERE COMM_TYPE = 'CLIENT_CATG' and flag_1 is null;`);
            res.json(result.rows);
        } else {
            result = await pool.query(`SELECT COMM_ID, DESCRIPTION FROM CDBM.COMMON_MASTER
          WHERE COMM_TYPE = 'CLIENT_CATG' and flag_1='${p_catg}';`);
            res.json(result.rows);
        }

        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/get_doc_types', async (req, res) => {
    const { p_sub_catg } = req.query;
    console.log('p_sub_catg---->', p_sub_catg);
    try {

        const result = await pool.query(`SELECT doc_type FROM CDBM.DOC_MAPPING_MASTER
          WHERE catg = '${p_sub_catg}';`);
        res.json(result.rows);

        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/get_doc_names', async (req, res) => {
    const { p_sub_catg } = req.query;
    console.log('p_sub_catg---->', p_sub_catg);
    try {

        const result = await pool.query(`SELECT dmm.doc_name doc_id, cm.description document 
        FROM CDBM.DOC_MAPPING_MASTER dmm
        JOIN cdbm.common_master cm ON dmm.doc_name=cm.comm_id
          WHERE catg = '${p_sub_catg}';`);
        res.json(result.rows);

        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/get_sub_catg_mii_dets', async (req, res) => {
    const { p_sub_catg } = req.query;
    console.log('p_sub_catg---->', p_sub_catg);
    try {

        const result = await pool.query(`SELECT comm_id, description  
        FROM CDBM.COMMON_MASTER WHERE flag_1 = '${p_sub_catg}';`);
        res.json(result.rows);

        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/get_subdealer_ddl', async (req, res) => {
    const { p_dealer_cd } = req.query;
    console.log('p_dealer_cd---->', p_dealer_cd);
    try {

        const result = await pool.query(`SELECT sub_dealer_cd, sub_dealer_name  
        FROM CDBM.SUB_DEALER WHERE dealer_cd = ${p_dealer_cd};`);
        res.json(result.rows);

        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/client-Occupation', async (req, res) => {
    try {
        const result = await pool.query("SELECT COMM_ID, DESCRIPTION FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'OCCUPATION'");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/client-designation', async (req, res) => {
    try {
        const result = await pool.query("SELECT COMM_ID, DESCRIPTION FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'DESIGNATION'");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/client-prefix', async (req, res) => {
    try {
        const result = await pool.query("SELECT COMM_ID, DESCRIPTION,nse_val FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'NAME_PREFIX'");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/client-gender', async (req, res) => {
    try {
        const result = await pool.query("SELECT COMM_ID, DESCRIPTION,nse_val FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'GENDER'");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/client-marital_status', async (req, res) => {
    try {
        const result = await pool.query("SELECT COMM_ID, DESCRIPTION,nse_val FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'MARITAL_STATUS'");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/client-bank_ac_type', async (req, res) => {
    try {
        const result = await pool.query("SELECT COMM_ID, DESCRIPTION,nse_val FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'BANK_AC_TYPE'");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/client-proof_type', async (req, res) => {
    try {
        const result = await pool.query("SELECT COMM_ID, DESCRIPTION,nse_val FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'PROOF_TYPE'");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/client-politic_exposed', async (req, res) => {
    try {
        const result = await pool.query("SELECT COMM_ID, DESCRIPTION,nse_val FROM CDBM.COMMON_MASTER WHERE COMM_TYPE = 'POLITIC_EXPOSED'");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

client_master_routes.get('/searchBrokCode', async (req, res) => {
    const { p_brok_code } = req.query;
    console.log('p_brok_code',p_brok_code);
    try {
        const getCnt = ` SELECT count(1) AS row_cnt FROM cdbm.Client_Master WHERE client_code = $1; `;
        result = await pool.query(getCnt, [p_brok_code]);
        var row_cnt = result.rows[0].row_cnt;
        if (row_cnt > 0) {
            res.json({ message: 'This Brok Code already exists in the table!' });
        } else {
            res.json({ message: 'This Brok Code does not exist in the table!' });
        }

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

client_master_routes.get('/ddl_catg_doc_mapp', async (req, res) => {
    try {

        let query = `SELECT comm_id, description FROM cdbm.common_master WHERE comm_type = 'CLIENT_CATG' ORDER BY comm_id;`

        const result = await pool.query(query);

        //console.log('result of CATEGORY ddl....', result);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

client_master_routes.get('/ddl_sub_catg_doc_mapp', async (req, res) => {
    try {

        let query = `select comm_id, description from cdbm.common_master where comm_type = 'CLIENT_SUB_CATG' order by comm_id;`

        const result = await pool.query(query);

        //console.log('result of SUB-CATEGORY ddl....', result);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

client_master_routes.get('/ddl_doc_names', async (req, res) => {
    try {

        let query = `SELECT comm_id, description FROM cdbm.common_master WHERE comm_type = 'PROOF_TYPE' ORDER BY comm_id;`

        const result = await pool.query(query);

        //console.log('result of CATEGORY ddl....', result);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

client_master_routes.get('/mii_names_ddl', async (req, res) => {
    try {

        let query = `SELECT mii_id, mii_short_name mii_name FROM cdbm.mii_master order by mii_id;`;

        const result = await pool.query(query);

        //console.log('result of CATEGORY ddl....', result);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

client_master_routes.get('/segments_ddl', async (req, res) => {
    try {

        let query = `SELECT std_val, seg_name FROM cdbm.segment_master order by std_val;`;

        const result = await pool.query(query);

        //console.log('result of CATEGORY ddl....', result);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

client_master_routes.get('/dealer_ddl', async (req, res) => {
    try {

        let query = `SELECT dealer_cd, dealer_name FROM cdbm.dealer_master order by dealer_cd;`;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

client_master_routes.post('/searchPAN', async (req, res) => {
    const { pan } = req.body;

    // Simple validation
    if (!pan) {
        console.error('PAN is required');
        return res.status(400).json({ error: 'PAN is required' });
    }

    try {
        console.log('Checking PAN:', pan); // Log the PAN being checked
        const result = await pool.query('SELECT * FROM cdbm.Client_Master WHERE pan = $1', [pan]);

        // Determine if the PAN was found
        const found = result.rows.length > 0; // true if found, false if not
        console.log('PAN found:', found); // Log the result

        // Return the result
        return res.json({ found });
    } catch (error) {
        console.error('Error fetching PAN:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

client_master_routes.post('/ClientAllDATA', async (req, res) => {
    const { userId, formData, occupationData, communicationData, addrData, entityData,
        namedata, Bankdetails, DepositData, Nomineedetails, communicationTableData,
        details, poaPoiDetails, miidetails } = req.body;
    // console.log('formdata', formData);
    // console.log("occupationdata", occupationData);
    // console.log("communicationData", communicationData);
    // console.log("entityData:", entityData);
    // console.log("namedata:", namedata);
    // console.log('bankdetais+++++++++', Bankdetails);
    // console.log('Nomineedetails+++++++++', Nomineedetails);
    // console.log('DepositData', DepositData);
    // console.log('communicationTableData', communicationTableData);
    // console.log('contact Person details', details);

    //// Destructure necessary fields from formData
    const {
        clientName, client_short_name, category, sub_category, crn, NSECode, applDate, account_opening_date, status,
        namePrefix, firstName, middleName, lastName, pan, gender, maritalStatus, nationality, nationality_other, dob, birth_country,
        gst, gst_state, isdcode_mobile_1, mobile_1, relation_flag,
        isdcode_mobile_2, mobile_2, email_id_1, email_id_2, res_tel_no, Office_tel_no, whatsapp, telegram_app,
    } = formData;

    // cin,cust_part_code, registration_no, registration_auth, place_of_registration, registration_date,
    // client_agrm_date, unique_client_code, upd_flag, relationship, type_of_facility, proof_type, proof_no,
    // place_issue_proof, date_issue_proof

    const {
        occupation_id, occupation_details, office_name, office_tele, designation,
        general_group, family_group, inperson_verification, person_doing_verif,
        organisation, code, place, date, vid_rec_file_name
    } = occupationData;
    // officeaddress1, officeaddress2, officeaddress3, office_state,trade_group, dealer_group, sub_dealer_group, ddpi_poa

    // const {
    //   address_line_1, address_line_2, address_line_3, city, state, state_other, country, pin_code, permanentAddress, permanentaddress_line_1,
    //   permanentaddress_line_2, permanentaddress_line_3, permanentcity, permanentstate, permanentstate_other,
    //   permanentcountry, permanentpin_code, isdcode_mobile_2, isdcode_mobile_1, res_tel_no, Office_tel_no, mobile_1, mobile_2, email_id_1, email_id_2, whatsapp, telegram_app, relation_flag
    // } = communicationData;

    // Initialize values for the names
    let FathernamePrefix = null;
    let FatherfirstName = null;
    let FathermiddleName = null;
    let FatherlastName = null;
    let MothernamePrefix = null;
    let MotherfirstName = null;
    let MothermiddleName = null;
    let MotherlastName = null;
    let SpousenamePrefix = null;
    let SpousefirstName = null;
    let SpousemiddleName = null;
    let SpouselastName = null;
    let MaidennamePrefix = null;
    let MaidenfirstName = null;
    let MaidenmiddleName = null;
    let MaidenlastName = null;


    // Loop through namedata to populate the respective fields
    for (const name of namedata) {
        switch (name.relation) {
            case 'Father':
                FathernamePrefix = name.prefix || FathernamePrefix;
                FatherfirstName = name.firstName || FatherfirstName;
                FathermiddleName = name.middleName || FathermiddleName;
                FatherlastName = name.lastName || FatherlastName;
                break;
            case 'Mother':
                MothernamePrefix = name.prefix || MothernamePrefix;
                MotherfirstName = name.firstName || MotherfirstName;
                MothermiddleName = name.middleName || MothermiddleName;
                MotherlastName = name.lastName || MotherlastName;
                break;
            case 'Spouse':
                SpousenamePrefix = name.prefix || SpousenamePrefix;
                SpousefirstName = name.firstName || SpousefirstName;
                SpousemiddleName = name.middleName || SpousemiddleName;
                SpouselastName = name.lastName || SpouselastName;
                break;
            case 'Maiden':
                MaidennamePrefix = name.prefix || MaidennamePrefix;
                MaidenfirstName = name.firstName || MaidenfirstName;
                MaidenmiddleName = name.middleName || MaidenmiddleName;
                MaidenlastName = name.lastName || MaidenlastName;
                break;
            default:
                break;
        }
    }

    try {
        const getBrokCodeCnt = ` SELECT count(1) AS row_cnt FROM cdbm.Client_Master WHERE client_code = $1; `;
        result = await pool.query(getBrokCodeCnt, [NSECode]);
        var row_cnt = result.rows[0].row_cnt;

        if (row_cnt > 0) {
            res.json({ message: 'This Brok Code already exists in the table. Code should be unique!' });
            return;
        }
        /// Your SQL INSERT statement
        // console.log('userId====',userId);
        // OFFICE_ADDR_1, OFFICE_ADDR_2, OFFICE_ADDR_3, OFFICE_STATE,
        const personalQuery = `
            INSERT INTO cdbm.Client_Master (
            CLIENT_CODE ,INDV_ENTITY,CRN, APPL_DATE, ACC_OPENING_DATE, CATG_ID, SUB_CATG, CLI_FULL_NAME, 
            CLI_SHORT_NAME, CLI_NAME_PREFIX, CLI_FIRST_NAME, CLI_MIDDLE_NAME, CLI_LAST_NAME, 
            FATHER_NAME_PREFIX, FATHER_FIRST_NAME, FATHER_MIDDLE_NAME, FATHER_LAST_NAME, MOTHER_NAME_PREFIX, 
            MOTHER_FIRST_NAME, MOTHER_MIDDLE_NAME, MOTHER_LAST_NAME, SPOUSE_NAME_PREFIX, SPOUSE_FIRST_NAME, 
            SPOUSE_MIDDLE_NAME,SPOUSE_LAST_NAME, MAIDEN_NAME_PREFIX, MAIDEN_FIRST_NAME, MAIDEN_MIDDLE_NAME,
            MAIDEN_LAST_NAME, PAN, CLIENT_GENDER,MARITAL_STATUS, NATIONALITY, NATIONALITY_OTHERS, 
            DOB_DOI,COUNTRY_BIRTH_INCORP,GST_NO,GST_STATE, OCCUPATION_ID, OCCUPATION_DETAILS,OFFICE_NAME, 
            PERS_OFFICE_TELEPHONE, DESIGNATION, STATUS_ID, STATUS_REMARKS,
            GENERAL_GRP_ID, FAMILY_GRP_ID, INPERSON_VERIFICATION, PERSON_DOING_VERIF, ORGANISATION, 
            CODE, PLACE, DATE, VID_REC_FILE_NAME, RESIDENCE_TELEPHONE, CONT_OFFICE_TELEPHONE
            ,OFFICE_EMAIL_ID, MOBILE_NO_1, MOBILE_NO_2, WHATSAPP_NO, TELEGRAM_NO, 
            RESIDENT_EMAIL_ID,RELATION_FLAG,ISDCODE_MOBILE_1,ISDCODE_MOBILE_2, ADD_USER_ID, ADD_DATE
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 
             $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, 
             $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, 
             $58, $59, $60, $61, $62, $63, $64, $65, $66, clock_timestamp());
        `;
        // CIN, CUST_PART_CD, REGSTN_NO,TRADER_GRP_ID, DEALER_GRP_ID,SUB_DEALER_GRP_ID,DDPI_AND_POA         
        //     REGSTN_AUTH, PLACE_OF_REGSTN, REGSTN_DATE, INPERSON_VERIFICATION, CLI_AGRM_DATE, UNIQUE_CLI_CD, UPD_FLAG,
        //     RELATIONSHIP, TYPE_OF_FACILITY, PROOF_TYPE, PROOF_NO, PLACE_ISSUE_PROOF, DATE_ISSUE_PROOF

        const personalValues = [
            //form data
            NSECode, null, crn, applDate || null, account_opening_date || null, category, sub_category, clientName, client_short_name,
            namePrefix, firstName, middleName, lastName, FathernamePrefix, FatherfirstName, FathermiddleName, FatherlastName,
            MothernamePrefix, MotherfirstName, MothermiddleName, MotherlastName, SpousenamePrefix, SpousefirstName, SpousemiddleName,
            SpouselastName, MaidennamePrefix, MaidenfirstName, MaidenmiddleName, MaidenlastName, pan, gender, maritalStatus, nationality,
            nationality_other, dob || null, birth_country, gst, gst_state,
            //occupation data 
            occupation_id, occupation_details, office_name, office_tele, designation,
            status, null, general_group, family_group, inperson_verification, person_doing_verif,
            organisation, code, place, date, vid_rec_file_name || null,
            res_tel_no, Office_tel_no, email_id_1, mobile_1, mobile_2, whatsapp, telegram_app, email_id_2, relation_flag,
            isdcode_mobile_1, isdcode_mobile_2, userId
        ];
        // officeaddress1, officeaddress2, officeaddress3, office_state,trade_group, dealer_group, sub_dealer_group, ddpi_poa,
        //corr-perm addr data
        // cin, cust_part_code, registration_no, registration_auth, place_of_registration, registration_date,
        //   inperson_verification, client_agrm_date, unique_client_code, upd_flag, relationship, type_of_facility,
        //   proof_type, proof_no, place_issue_proof, date_issue_proof,
        console.log('personalValues--------', personalValues);
        await pool.query(personalQuery, personalValues);

        // const communicationQuery = `
        //    INSERT INTO cdbm.communicationTab (
        //     CLIENT_ID,CORRES_ADDR_1, CORRES_ADDR_2, CORRES_ADDR_3, CORRES_CITY, CORRES_STATE_ID,
        //     CORRES_STATE_OTHER, CORRES_COUNTRY_ID, CORRES_PIN,IS_PERM_ADDR_CORRES, PERM_ADDR_1,
        //     PERM_ADDR_2, PERM_ADDR_3, PERM_CITY, PERM_STATE_ID, PERM_STATE_OTHER, PERM_COUNTRY_ID,
        //     PERM_PINRESIDENCE_TELEPHONE,OFFICE_TELEPHONE,OFFICE_EMAIL_ID, MOBILE_NO_1, MOBILE_NO_2,
        //     WHATSAPP_NO, TELEGRAM_NO, RESIDENT_EMAIL_ID,relation_flag,isdcode_mobile_2,isdcode_mobile_1
        //    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
        //  `;

        // const communicationValues = [
        //   NSECode, address_line_1, address_line_2, address_line_3, city, state, state_other, country, pin_code,
        //   ispermanentAddress, permanentaddress_line_1, permanentaddress_line_2, permanentaddress_line_3, permanentcity, 
        //   permanentstate, permanentstate_other, permanentcountry, permanentpin_coderes_tel_no, Office_tel_no, email_id_1,
        //   mobile_1, mobile_2, whatsapp, telegram_app, email_id_2, relation_flag, isdcode_mobile_2, isdcode_mobile_1
        // ];

        ////Insert into communicationTab
        // await pool.query(communicationQuery, communicationValues);

        // Inserting data into bankDetails
        const max_no = await pool.query(`select coalesce(max(bank_dtl_id), 0) max_no from cdbm.bankDetails;`);

        var bankDtlId = Number(max_no.rows[0].max_no);

        const bankQuery = `
      INSERT INTO cdbm.bankDetails (
        BANK_DTL_ID, PARENT_ID, BANK_FOR, BANK_NAME, BANK_ACC_TYPE, BANK_ACC_NO, UPI_ID , NSDL_FLAG, PRIMARY_ACC_FLAG, POA_FUNDS_FLAG,
        START_DATE, END_DATE, MICR, IFSC, BANK_ADDR_1, BANK_ADDR_2, BANK_ADDR_3, DATE_OF_REG_POA_YES, STATUS,
        ADD_USER_ID, ADD_DATE        
      ) VALUES ($1, $2, 'CLIENT', $3, $4, $5, $6, $7, $8, $9, 
                $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, clock_timestamp());
    `;

        // Loop through allBankDetails to insert each entry
        for (const bankDetail of Bankdetails) {

            const { bank_name, bank_address_1, bank_address_2, bank_address_3, bank_acc_no,
                bank_acc_type, start_date, end_date, micr, ifsc, upi_id, poa_funds, date_of_reg,
                nsdl, ac_status, primary_account
            } = bankDetail

            const nsdlValue = nsdl ? 1 : 0;
            const primaryAccountValue = primary_account ? 1 : 0;
            const POA_funds_value = poa_funds ? 1 : 0;
            bankDtlId += 1;
            await pool.query(bankQuery, [
                bankDtlId, NSECode, bank_name || null, bank_acc_type || null, bank_acc_no, upi_id, nsdlValue,
                primaryAccountValue, POA_funds_value, start_date || null, end_date || null, micr, ifsc,
                bank_address_1, bank_address_2, bank_address_3, date_of_reg || null, ac_status, userId,
            ]);
        }

        const depositQuery = `
      INSERT INTO cdbm.client_dp (
        CLIENT_CODE, CLIENT_NAME, DP_NAME, DP_ID, CLIENT_ID, CRN_NO, START_DATE, END_DATE, PRIMARY_DP_FLAG, ADD_USER_ID, ADD_DATE   
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, clock_timestamp());
    `;

        for (const depositData of DepositData) {
            const { depository_name, depository_id, deposit_client_id, deposit_start_date, deposit_end_date, deposit_primary } = depositData

            const primaryDepositValue = deposit_primary ? 1 : 0;

            await pool.query(depositQuery, [NSECode, clientName, depository_name, depository_id, deposit_client_id, crn,
                deposit_start_date || null, deposit_end_date || null, primaryDepositValue, userId]);
        }

        const contactPersonQuery = `
    INSERT INTO cdbm.CLIENT_CONT_PERSON (
      CLIENT_CODE, ARN, CONTACT_NAME, CONTACT_TYPE, DESIGNATION, ADDRESS, PAN, MOBILE_NO, UID,
      EMAIL_ID, FROM_DATE, TO_DATE, REMARKS, ADD_USER_ID, ADD_DATE
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, clock_timestamp());
    `;

        for (const contactPerson of details) {
            const { arn, name, type, designation, address, pan, mobile_no, uid, email_id, from_date, to_date, remarks } = contactPerson
            await pool.query(contactPersonQuery, [NSECode, arn, name, type, designation, address, pan, mobile_no,
                uid, email_id, from_date || null, to_date || null, remarks, userId]);
        }

        //Nominee  table insertion 
        const nomineeQuery = `
      INSERT INTO cdbm.CLIENT_NOMINEE (
        CLIENT_CODE, NOMINEE_GUARDIAN_FLAG, NOMINEE_GUARDIAN_NAME, PERC_SHARE, NOMINEE_MINOR_FLAG,
        MINOR_NOMINEE_GUARD_NAME, MINOR_NOMINEE_DOB, NOMINEE_GUARDIAN_UID_PAN, ADD_USER_ID, ADD_DATE
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,clock_timestamp());
      `;

        for (const nomineeDetail of Nomineedetails) {
            const { Nomine_Guardian, Nomine_Guardian_name, perc_share, minor_nominee, minor_nominees_guardian_name,
                minor_nominees_dob, nominee_guardianUid_pan } = nomineeDetail;

            const nomGuardFlag = Nomine_Guardian ? 1 : 0;
            const minorNomFlag = minor_nominee ? 1 : 0;

            await pool.query(nomineeQuery, [NSECode, nomGuardFlag, Nomine_Guardian_name, perc_share, minorNomFlag,
                minor_nominees_guardian_name, minor_nominees_dob, nominee_guardianUid_pan, userId]);
        }

        if (category !== 'IND') {
            const entityQuery = `
          INSERT INTO cdbm.CLIENT_ENTITY (
              client_code, sub_catg, cin, registg_authority, type_registg_authority,
                 place_of_registn, registn_no, date_of_registn,
              exp_date, add_user_id, add_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, clock_timestamp());
      `;

            for (const entity of entityData) {
                const { cin, type_registering_authority, registering_authority,
                    place_of_registration, date_of_registration, registration_no, expiry_date, sub_category_entity } = entity;
                await pool.query(entityQuery, [NSECode, sub_category_entity, cin, registering_authority,
                    type_registering_authority, place_of_registration, registration_no || null,
                    date_of_registration || null, expiry_date || null, userId]);
            }
        }

        // Inserting data into address_master
        var lv_addr_id = 0;

        const max_result = await pool.query(`SELECT coalesce(max(addr_id), 0) + 1  max_no FROM cdbm.address_master;`);
        lv_addr_id = max_result.rows[0].max_no;
        const addrQuery = `
      INSERT INTO cdbm.address_master (
        ADDR_ID, PARENT_ID, ADDR_TYPE, ADDR_LINE1, ADDR_LINE2, ADDR_LINE3, CITY, PIN, 
        ADD_USER_ID, ADD_DATE        
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, clock_timestamp());
    `;

        // Loop through alladdrDetails to insert each entry
        for (const addrDetail of addrData) {

            const { type, addr_1, addr_2, addr_3, city, state, state_other, country, pin } = addrDetail

            await pool.query(addrQuery, [
                lv_addr_id, NSECode, type, addr_1, addr_2, addr_3, city, pin, userId
            ]);
            lv_addr_id++;
        }
        //     // }else{

        //     // }


        // Inserting data into CLIENT_POA_POI
        var lv_doc_id = 0;

        const max_res = await pool.query(`SELECT coalesce(max(doc_id), 0) + 1  max_no FROM  CDBM.CLIENT_POA_POI;`);
        lv_doc_id = max_res.rows[0].max_no;
        const cliPoaPoiQuery = `
      INSERT INTO CDBM.CLIENT_POA_POI (
        DOC_ID, CLIENT_CODE, DOC_TYPE, ADDR_TYPE, DOC_NAME, DOC_ID_NO, PLACE_OF_ISSUE, ISSUE_DATE, 
        EXPIRY_DATE, STATUS, START_DATE, ADD_USER_ID, ADD_DATE           
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', clock_timestamp(), $10, clock_timestamp());
    `;

        // Loop through alladdrDetails to insert each entry
        for (const poaPoiDetail of poaPoiDetails) {

            const { doc_type, addr_type, doc_name, id_no, place_of_issue, issue_date, expiry_date } = poaPoiDetail

            await pool.query(cliPoaPoiQuery, [
                lv_doc_id, NSECode, doc_type, addr_type, doc_name, id_no || null,
                place_of_issue || null, issue_date || null, expiry_date || null, userId
            ]);
            lv_doc_id++;
        }
        //     // }else{

        //     // }

        // Inserting data into miidetails
        const prim_key = await pool.query(`select coalesce(max(mii_det_cd), 0) max_no from CDBM.CLIENT_MII_MAPPING;`);

        var miiDtlId = Number(prim_key.rows[0].max_no);

        const miiDetQuery = `
       INSERT INTO CDBM.CLIENT_MII_MAPPING (
         MII_DET_CD, CLIENT_CODE, MII_NAME, MII_CODE, SEGMENT, SUB_CATG, POI, POA, DEALER, 
         SUB_DEALER, CUST_PART_CODE, CUST_PART_ID, ADD_USER_ID, ADD_DATE        
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
                 $10, $11, $12, $13, clock_timestamp());
     `;

        // Loop through allMIIDetails to insert each entry
        for (const miiDetail of miidetails) {

            const { mii_name, mii_code, segment, sub_catg, poi,
                poa, dealer_grp, sub_dealer_grp, cust_part_code, cust_part_id
            } = miiDetail

            miiDtlId += 1;
            await pool.query(miiDetQuery, [
                miiDtlId, NSECode, mii_name, mii_code, segment, sub_catg, poi,
                poa, dealer_grp, sub_dealer_grp, cust_part_code, cust_part_id, userId
            ]);
        }

        res.status(201).json({ message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ error: 'An error occurred while saving data' });
    }
});

module.exports = client_master_routes;
