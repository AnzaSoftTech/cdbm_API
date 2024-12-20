const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const mii_master_routes = express.Router();
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

mii_master_routes.get('/ddl_mii_bank_types', async (req, res) => {
    try {

        let query = `SELECT bank_type_id, type_name ` +
            ` FROM cdbm.MII_Bank_Type ORDER BY type_name;`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/ddl_cb_book_types', async (req, res) => {
    try {

        let query = `select distinct book_type from cdbm.fin_cash_bank_master order by book_type;`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/get_bankname_accountno', async (req, res) => {
    try {

        const { p_book_type } = req.query;

        console.log('p_book_type ==> ', p_book_type);

        let query = `select bank_name, bank_acc_no from cdbm.fin_cash_bank_master where book_type = '` + p_book_type + `';`;
        console.log('query ==> ', query);
        const result = await pool.query(query);
        console.log('result ==> ', result);
        res.json(result.rows);
    } catch (error) {
        logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.post('/save_mii_master', async (req, res) => {
    const { header } = req.body;
    const { miiCode, miiSrcCode, miiCat, miiName, miiShortName, gstNo, panNo, tan, sebiRegNo, mii_cc_id, activityCode, status, userId } = header;

    console.log('req.body ====> ', req.body);

    try {
        await pool.query('BEGIN');

        if (!miiCode) {
            // console.log('1');
            const max_result = await pool.query(`SELECT max(cast(mii_id as numeric(5))) as max_no ` +
                ` FROM cdbm.mii_master`);
            // console.log('max_result',max_result);
            var lv_max_no = max_result.rows[0].max_no;
            if (lv_max_no === null) {
                lv_max_no = 1;
                // console.log('2');
            }
            else {
                lv_max_no++;
                // console.log('3');
            }
            // console.log('4');
            const lv_mii_id = lv_max_no;
            const lv_ins_statement = `Insert into cdbm.mii_master (
                                        mii_id, mii_src_code, mii_catg, mii_name, mii_short_name, gst_no, pan, tan, sebi_regisn_no, mii_cc_id, activity_code, status, add_user_id, add_date)
                                  values ($1::numeric(5), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, clock_timestamp());`;

            await pool.query(lv_ins_statement, [lv_mii_id, miiSrcCode, miiCat, miiName, miiShortName, gstNo, panNo ? panNo : null, tan, sebiRegNo, mii_cc_id, activityCode, status, userId]);
            console.log('7');
        }
        else {
            // lv_max_no = miiCode;
            lv_upd_statement = `update cdbm.mii_master 
                              set mii_name=$1, mii_short_name=$2, gst_no=$3, pan=$4, tan=$5, sebi_regisn_no=$6, mii_cc_id=$7, status=$8, upd_user_id=$9 , upd_date = clock_timestamp()
          where mii_id = $10;`;
            await pool.query(lv_upd_statement, [miiName, miiShortName, gstNo, panNo ? panNo : null, tan, sebiRegNo, mii_cc_id, status, userId, miiCode]);
        }

        await pool.query('COMMIT');
        //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
        res.json({ message: '' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting voucher:', error);
        res.status(500).send('Error inserting voucher(s). Please try again.');
    }
});

mii_master_routes.get('/ddl_mii_master', async (req, res) => {
    const { p_mii_cat } = req.query;
    try {

        let query = `SELECT mii_src_code , mii_source_name ` +
            ` FROM cdbm.mii_source WHERE UPPER(mii_catg) like UPPER('%` + p_mii_cat + `%') `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        // logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/ddl_demat_mii_master', async (req, res) => {

    try {

        let query = `SELECT mii_src_code , mii_source_name ` +
            ` FROM cdbm.mii_source WHERE mii_catg = 'DEPOS' ;`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        // logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/ddl_mii_cc_id', async (req, res) => {
    try {

        let query = `SELECT MII_ID cc_id, MII_Name cc_Name  FROM cdbm.MII_Master  WHERE MII_CATG = 'CC' `

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        // logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/ddl_segment_master', async (req, res) => {
    try {

        let query = `SELECT seg_code, seg_name ` +
            ` FROM cdbm.segment_master order by seg_code; `;

        const result = await pool.query(query);

        //console.log('result of segment ddl....', result);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/search_Mii_Master', async (req, res) => {
    const { p_mii_name } = req.query;

    let query = `SELECT mii_name, mii_short_name, sebi_regisn_no, mii_id ` +
        ` FROM cdbm.mii_master WHERE UPPER(mii_name) like UPPER('%` + p_mii_name + `%') ;`;
    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.message);
        res.status(500).send('Server error');
    }
});

mii_master_routes.get('/get_MII_bank_details', async (req, res) => {
    const { p_MII_Id } = req.query;

    let query = `SELECT bank_dtl_id, dtl.bank_type_id bank_type_id, type_name, dtl.book_type book_type, ` +
        ` dtl.status status, from_date, to_date, bank_name, bank_acc_no ` +
        ` FROM cdbm.mii_bank_detail dtl ` +
        ` join cdbm.mii_bank_type type on dtl.bank_type_id = type.bank_type_id ` +
        ` join cdbm.fin_cash_bank_master cbm on cbm.book_type = dtl.book_type ` +
        ` WHERE mii_id = '` + p_MII_Id + `';`;

    //console.log('query --> ', query);
    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing get_MII_bank_details query:', err.message);
        res.status(500).send('Server error');
    }
});

mii_master_routes.get('/search_Mii_Master_ById', async (req, res) => {
    const { p_mii_id } = req.query;

    let query = `  SELECT mii_id, mii_src_code, mii_catg, mii_name, mii_short_name, gst_no, pan, tan, sebi_regisn_no, mii_cc_id, activity_code activity, status
     ` +
        `  FROM cdbm.mii_master ` +
        `  WHERE mii_id = '` + p_mii_id + `';`;

    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:--->', err.message);
        res.status(500).send('Server error');
    }
});

mii_master_routes.post('/save_MII_Bank_Details', async (req, res) => {

    const { header } = req.body;
    const { p_MII_code, bankDtlId, banktype, booktype, bankname, bankacctno, status, fromdate, todate, userId, } = header;

    //console.log('req.body ====> ', req.body);

    try {
        await pool.query('BEGIN');

        var lv_statement = '';
        var lv_bank_dtl_id = 0;

        if (!bankDtlId) {
            const max_result = await pool.query(`SELECT coalesce(max(bank_dtl_id), 0) + 1  max_no FROM cdbm.mii_bank_detail;`);
            lv_bank_dtl_id = max_result.rows[0].max_no;

            lv_statement = `Insert into cdbm.mii_bank_detail (bank_dtl_id, mii_id, bank_type_id, book_type, status, ` +
                ` from_date, to_date, add_user_id, add_date) ` +
                ` values ($1, $2, $3, $4, $5, $6, $7, $8, clock_timestamp());`;
            console.log('lv_bank_dtl_id, p_MII_code, banktype, booktype, status, fromdate, todate, userId >>>',
                lv_bank_dtl_id, p_MII_code, banktype, booktype, status, fromdate, todate, userId);
            await pool.query(lv_statement, [lv_bank_dtl_id, p_MII_code, banktype, booktype, status, fromdate, todate ? todate : null, userId]);
        }
        else {
            lv_bank_dtl_id = bankDtlId;
            lv_statement = `Update cdbm.mii_bank_detail ` +
                ` set bank_type_id = $1, book_type = $2, status = $3, upd_user_id = $4, ` +
                ` from_date = $5, to_date = $6, upd_date = clock_timestamp() ` +
                ` WHERE bank_dtl_id = $7; `;
            await pool.query(lv_statement, [banktype, booktype, status, userId, fromdate, todate ? todate : null, bankDtlId]);
        }


        lv_statement = '';

        await pool.query('COMMIT');
        //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
        res.json({ message: lv_bank_dtl_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting bank details:', error);
        res.status(500).send('Error inserting address/contact person. Please try again.');
    }
});

mii_master_routes.post('/save_MII_Deemat_Details', async (req, res) => {
    //const { header, details } = req.body;
    const { header } = req.body;
    const { p_MII_code, deematDtlId, acctType, depos, cmBpId, dpId, clientId, status, startDate, endDate, userId } = header;

    //console.log('req.body ====> ', req.body);

    try {
        await pool.query('BEGIN');

        var lv_statement = '';
        var lv_deemat_dtl_id = 0;

        if (!deematDtlId) {
            // console.log('endDate for deemat>>>>',endDate);
            const max_result = await pool.query(`SELECT coalesce(max(deemat_dtl_id), 0) + 1  max_no FROM cdbm.mii_deemat_detail;`);
            lv_deemat_dtl_id = max_result.rows[0].max_no;

            lv_statement = `Insert into cdbm.mii_deemat_detail (deemat_dtl_id, mii_id, acc_type, depos, cm_bp_id, dp_id, 
                        client_id, status, start_date, end_date, add_user_id, add_date)` +
                ` values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, clock_timestamp());`;
            // console.log('lv_bank_dtl_id, p_MII_code, banktype, booktype, status, fromdate, todate, userId >>>', 
            //   lv_bank_dtl_id, p_MII_code, banktype, booktype, status, fromdate, todate, userId );
            await pool.query(lv_statement, [lv_deemat_dtl_id, p_MII_code, acctType, depos, cmBpId, dpId, clientId,
                status, startDate, endDate ? endDate : null, userId]);
        }
        else {
            lv_deemat_dtl_id = deematDtlId;
            lv_statement = `Update cdbm.mii_deemat_detail ` +
                ` set acc_type = $1, depos = $2, cm_bp_id = $3, dp_id = $4, ` +
                ` client_id = $5, status = $6, start_date = $7, end_date = $8, upd_user_id = $9, upd_date = clock_timestamp()` +
                ` WHERE deemat_dtl_id = $10 AND mii_id = $11; `;
            await pool.query(lv_statement, [acctType, depos, cmBpId, dpId, clientId, status, startDate,
                endDate ? endDate : null, userId, deematDtlId, p_MII_code]);
        }


        lv_statement = '';

        await pool.query('COMMIT');
        //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
        res.json({ message: lv_deemat_dtl_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting deemat details:', error);
        // res.status(500).send('Error inserting address/contact person. Please try again.');
    }
});

mii_master_routes.get('/get_MII_deemat_details', async (req, res) => {
    const { p_MII_Id } = req.query;

    let query = ` SELECT deemat_dtl_id, acc_type, depos, cm_bp_id, dp_id, client_id,` +
        ` status, start_date, end_date` +
        ` FROM cdbm.mii_deemat_detail ` +
        ` WHERE mii_id = '` + p_MII_Id + `';`;
    // ` join cdbm.mii_bank_type type on dtl.bank_type_id = type.bank_type_id ` +
    // ` join cdbm.fin_cash_bank_master cbm on cbm.book_type = dtl.book_type ` +

    //console.log('query --> ', query);
    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing get_MII_deemat_details query:', err.message);
        res.status(500).send('Server error');
    }
});

mii_master_routes.post('/save_address_cont_persons', async (req, res) => {
    const { header, details } = req.body;
    //const { header} = req.body;
    const { addrId, p_mii_Code, addrfor, branchname, addrLine1, addrLine2, addrLine3, city, pin, phone1, phone2, phone3,
        email, website, addrstatus, addrtype, userId } = header;

    //console.log('req.body ====> ', req.body);

    try {
        await pool.query('BEGIN');


        var lv_statement = '';
        var lv_cont_person_inst_up = '';
        var lv_cont_pers_id = 0;
        var lv_addr_id = 0;

        if (!addrId) {
            const max_result = await pool.query(`SELECT coalesce(max(addr_id), 0) + 1  max_no FROM cdbm.address_master;`);
            lv_addr_id = max_result.rows[0].max_no;
            lv_statement = `Insert into cdbm.address_master (addr_id, parent_id, addr_type, addr_for, branch_name, addr_line1, addr_line2, addr_line3, ` +
                ` city, pin, phone1, phone2, phone3, email_id, website, status, add_user_id, add_date) ` +
                ` values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, clock_timestamp());`;
            await pool.query(lv_statement, [lv_addr_id, p_mii_Code, addrtype, addrfor ? addrfor : null, branchname, addrLine1, addrLine2, addrLine3,
                city, pin, phone1, phone2, phone3, email, website, addrstatus, userId]);
        }
        else {
            lv_addr_id = addrId;
            lv_statement = `Update cdbm.address_master ` +
                ` set branch_name = $1, addr_line1 = $2, addr_line2 = $3, addr_line3 = $4, ` +
                `  city = $5, pin = $6, phone1 = $7, phone2 = $8, phone3 = $9, email_id = $10, website = $11,` +
                `  status = $12, upd_user_id = $13, upd_date = clock_timestamp() ` +
                ` WHERE addr_id = $14 and (` +
                `      branch_name != $1 or addr_line1 != $2 or addr_line2 != $3 or addr_line3 != $4 or ` +
                `  city != $5 or pin != $6 or phone1 != $7 or phone2 != $8 or phone3 != $9 or email_id != $10 or website != $11 ` +
                `  or status != $12);`
            await pool.query(lv_statement, [branchname, addrLine1, addrLine2, addrLine3, city, pin,
                phone1, phone2, phone3, email, website, addrstatus, userId, addrId]);
        }

        //// Start : Contact Person Insert/Update

        for (let detail of details) {
            const { cont_pers_id, contact_person, designation, department, cont_pers_mobile, cont_pers_phone, extn, cont_pers_email1, cont_pers_email2 } = detail;
            console.log('contact person detail ===> ', detail);
            if (contact_person.length) {
                if (!cont_pers_id) {
                    const max_result = await pool.query(`SELECT coalesce(max(cont_pers_id), 0) + 1  max_no FROM cdbm.cont_person_master;`);
                    var lv_cont_pers_id = max_result.rows[0].max_no;
                    lv_cont_person_inst_up = `insert into cdbm.cont_person_master ( ` +
                        `  cont_pers_id, addr_id, cont_pers_name, designation, dept, email_id1, email_id2, ` +
                        ` mobile, phone, extn, add_user_id, add_date) ` +
                        ` values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, clock_timestamp()) `;
                    await pool.query(lv_cont_person_inst_up, [lv_cont_pers_id, lv_addr_id, contact_person, designation, department, cont_pers_email1, cont_pers_email2,
                        cont_pers_mobile, cont_pers_phone, extn, userId]);
                }
                else {
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
                        cont_pers_mobile, cont_pers_phone, extn, userId, cont_pers_id, lv_addr_id]);
                }
            } // end for : if (contact_person)

        } /// end of for loop

        lv_statement = '';

        await pool.query('COMMIT');
        res.json({ message: lv_addr_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting branch/contact person:', error);
        res.status(500).send('Error inserting branch/contact person. Please try again.');
    }
});



mii_master_routes.get('/get_addresses', async (req, res) => {
    const { p_addr_type, p_act_Code } = req.query;

    let query = `SELECT addr_id, addr_type, addr_for, branch_name, micr, addr_line1, addr_line2, addr_line3, ` +
        ` city, pin, phone1, phone2, phone3, email_id, website, status ` +
        ` FROM cdbm.address_master WHERE UPPER(addr_type) = UPPER('` + p_addr_type + `') ` +
        ` and parent_id = '` + p_act_Code + `';`;

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


mii_master_routes.get('/get_cont_persons', async (req, res) => {
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

mii_master_routes.post('/save_mii_segments', async (req, res) => {
    const { header, details } = req.body;
    const { p_MII_code , userId } = header;

    //console.log('save_mii_segments req.body ====> ', req.body);

    try {

        await pool.query('BEGIN');
        var lv_statement = '';

        for (let detail of details) {
            const { segment, exist } = detail;
            //console.log('p_MII_code, segment, userId ====> ', p_MII_code, segment, userId);
            if (segment && exist === 'F') {
                lv_statement = `insert into cdbm.mii_segment ( ` +
                    `  mii_id, seg_code, add_user_id, add_date) ` +
                    ` values ($1, $2, $3, clock_timestamp()) `;
              //  console.log('lv_statement ====> ', lv_statement);
                
                await pool.query(lv_statement, [p_MII_code, segment, userId]);
            }
        } 

        lv_statement = '';

        await pool.query('COMMIT');
        res.json({ message: 1 });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting mii segment :', error);
        res.status(500).send('Error inserting mii Segment. Please try again.');
    }
});


mii_master_routes.get('/get_mii_segments', async (req, res) => {
    const { p_MII_Code } = req.query;
    
    let query = `SELECT mii_id, seg_code, 'T' exist ` +
        ` FROM cdbm.mii_segment WHERE mii_id = '` + p_MII_Code + `';`;

       // console.log('get_mii_segments query ====> ', query);

    try {
        const result = await pool.query(query);
        //console.log('Final result > :', result);
        res.json(result.rows);
    } catch (err) {
        console.error('Error get_mii_segments query:', err.message);
        res.status(500).send('Server error');
    }
});

mii_master_routes.get('/ddl_activity_master', async (req, res) => {
    try {

        const { p_segment_cd } = req.query;

        let query = `SELECT activity_cd, act_name  ` +
            ` FROM cdbm.activity_master ` +
            ` WHERE seg_code = '` + p_segment_cd + `'` +
            ` order by activity_cd; `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        console.log('error  >>>>>', error);
        //  logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/ddl_fin_group_level2', async (req, res) => {
    try {

        let query = `SELECT grp_cd_lvl2, grp_desc ` +
            ` FROM cdbm.fin_group_level2 order by grp_desc; `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        //  logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/ddl_fin_group_level3', async (req, res) => {
    try {

        const { p_grp_lvl2 } = req.query;

        // console.log('p_grp_lvl2 ==> ', p_grp_lvl2);

        let query = `SELECT grp_cd_lvl3, grp_desc ` +
            ` FROM cdbm.fin_group_level3 ` +
            ` WHERE grp_cd_lvl2 = ` + p_grp_lvl2 +
            ` ORDER BY grp_desc; `;

        const result = await pool.query(query);

        res.json(result.rows);

    } catch (error) {
        //logError(error, req);
        res.status(500).send(error.message);
    }
});

mii_master_routes.get('/ddl_fin_group_level4', async (req, res) => {
    try {

        const { p_grp_lvl3 } = req.query;

        // console.log('p_grp_lvl3 => ', p_grp_lvl3);

        let query = `SELECT grp_cd_lvl4, grp_desc ` +
            ` FROM cdbm.fin_group_level4 ` +
            ` WHERE grp_cd_lvl3 = ` + p_grp_lvl3 +
            ` ORDER BY grp_desc; `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        // console.log('error ==> ', error);
        res.status(500).send(error.message);
    }
});

module.exports = mii_master_routes;
