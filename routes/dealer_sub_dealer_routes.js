const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const deal_sub_deal_router = express.Router();
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

deal_sub_deal_router.get('/ddl_segment_master', async (req, res) => {
    try {
        let query = `SELECT seg_code, seg_name ` +
            ` FROM cdbm.segment_master order by seg_code; `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        //logError(error, req);
        console.log('ddl_segment_master error :', error);
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.get('/ddl_desler_activity_master', async (req, res) => {
    try {
        let query = `SELECT activity_cd, act_name  ` +
            ` FROM cdbm.activity_master ` +
            ` order by activity_cd; `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.log('error  >>>>>', error);
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.get('/ddl_MI_master', async (req, res) => {
    try {
        var lv_grp_cd_lvl3 = req;

        let query = `SELECT MII_Id exc_Cd, MII_Name exc_Name ` +
            ` FROM cdbm.MII_Master ` +
            ` WHERE MII_CATG = 'EXC'`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        logError(error, req);
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.get('/ddl_slab_master', async (req, res) => {
    try {
        const query = 'SELECT BR_SLAB_ID, BR_SLAB_NAME, ALIAS FROM CDBM.SUB_DEALER_SLAB_MASTER ORDER BY BR_SLAB_NAME;';
        const result = await pool.query(query);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.get('/get_dealer_master', async (req, res) => {
    try {
        const { dealerName, alias } = req.query;

        var query = `SELECT DEALER_CD, DEALER_NAME, DEALER_ALIAS, STATUS FROM CDBM.DEALER_MASTER WHERE 1 = 1 `;

        if (dealerName) {
            query += `AND DEALER_NAME ILIKE '%` + dealerName + `%' `;
        }
        if (alias) {
            query += `AND DEALER_ALIAS ILIKE '%` + alias + `%' `;
        }
        query += `ORDER BY DEALER_NAME;`;

        const result = await pool.query(query);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.get('/get_dealer_master_by_id', async (req, res) => {
    try {
        const { dealerCode } = req.query;

        var query = `SELECT DEALER_CD, to_char(OPENING_DATE, 'yyyy-MM-dd') OPENING_DATE, ACTIVITY_CD, DEALER_NAME, DEALER_ALIAS, STATUS ` +
            `, to_char(ST_CHANGE_DT, 'yyyy-MM-dd') ST_CHANGE_DT, PAN, IT_WARD_NO, TDS_RATE, ORDER_LIMIT ` +
            `, GROSS_LIMIT, NET_LIMIT ` +
            `FROM CDBM.DEALER_MASTER WHERE DEALER_CD = $1;`;

        const result = await pool.query(query, [dealerCode]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.post('/save_exchange_link', async (req, res) => {
    try {
        await pool.query('BEGIN');

        const { header } = req.body;

        const { dealerCode, activityCode, exchange, segment, dealerorderlimit, dealergrosslimit, dealernetlimit, dateappl
            , excstatus, statuschangedate, editMode, userId } = header;

        if (editMode) {
            const dbStatus = (await pool.query(`select status from cdbm.dealer_exc_link where dealer_cd = $1 AND exc_cd = $2 AND seg_code = $3;`
                , [dealerCode, exchange, segment])).rows[0].status;

            if (dbStatus !== excstatus) {
                const stsValQuery = `UPDATE cdbm.dealer_exc_link SET st_change_dt = clock_timestamp() ` +
                    `WHERE dealer_cd = $1 AND exc_cd = $2 AND seg_code = $3;`;

                await pool.query(stsValQuery, [dealerCode, exchange, segment]);
            }
            
            let updateQuery = `UPDATE CDBM.DEALER_EXC_LINK SET order_limit = $1, gross_limit = $2, net_limit = $3, date_appl = $4 `+
            `, status = $5, upd_user_id = $6, upd_date = clock_timestamp() WHERE dealer_cd = $7 AND exc_cd = $8 AND seg_code = $9;`;

            await pool.query(updateQuery, [dealerorderlimit, dealergrosslimit, dealernetlimit, dateappl, excstatus, userId, dealerCode, exchange
                , segment]);
        }
        else {
            let query = `INSERT INTO CDBM.DEALER_EXC_LINK (dealer_cd, exc_cd, seg_code, activity_cd, order_limit, gross_limit, net_limit` +
                `, date_appl, status, add_user_id, add_date, st_change_dt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, clock_timestamp() ` +
                `, $11);`;

            await pool.query(query,
                [dealerCode, exchange, segment, activityCode, dealerorderlimit, dealergrosslimit, dealernetlimit, dateappl
                    , excstatus, userId, statuschangedate || null]);
        }
        await pool.query('COMMIT');
        res.json({ message: 'Data saved successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.get('/get_dealer_exchange', async (req, res) => {
    try {
        const { p_Dealer_Code } = req.query;

        const query = `SELECT a.exc_cd, a.seg_code, b.mii_name exc_name, e.seg_name, a.order_limit, a.gross_limit, a.net_limit
                      , to_char(a.date_appl, 'yyyy-MM-dd') date_appl, to_char(a.st_change_dt, 'yyyy-MM-dd') st_change_dt, 
                      a.status FROM CDBM.DEALER_EXC_LINK a
                      JOIN CDBM.MII_MASTER b ON a.exc_cd = b.mii_id
                      JOIN cdbm.SEGMENT_MASTER e ON e.seg_code = a.seg_code WHERE a.dealer_cd = $1 ORDER BY mii_name;`;

        const result = await pool.query(query, [p_Dealer_Code]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).send(error.message);
    }
});


deal_sub_deal_router.post('/save_dealer_master', async (req, res) => {
    const { header } = req.body;
    const { dealerCode, dealername, aliasname, openingdate, dealerstatus, dealerPAN, wardno, tdsrate, statuschangedt,
        activityCode, orderlmt, netlmt, grosslmt, userId, } = header;

    try {
        await pool.query('BEGIN');

        var lv_dealer_cd = 0;

        if (!dealerCode) {
            const max_result = await pool.query(`SELECT COALESCE(MAX(dealer_cd), 0) + 1 max_no FROM cdbm.dealer_master;`);
            lv_dealer_cd = max_result.rows[0].max_no;

            const lv_ins_statement = `Insert into cdbm.dealer_master (
                                        dealer_cd, opening_date, dealer_name, dealer_alias, activity_cd, status, st_change_dt, pan,
                                        it_ward_no, tds_rate, order_limit, gross_limit, net_limit, add_user_id, add_date)
                                  values ($1, to_date($2, 'YYYY-MM-DD'), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, clock_timestamp());`;
            await pool.query(lv_ins_statement, [lv_dealer_cd, openingdate, dealername, aliasname, activityCode, dealerstatus, statuschangedt || null,
                dealerPAN, wardno, tdsrate, orderlmt, grosslmt, netlmt, userId]);
        }
        else {

            const dbStatus = (await pool.query(`select status from cdbm.dealer_master where dealer_cd  = $1;`, [dealerCode])).rows[0].status;

            if(dbStatus !== dealerstatus){
                const stsValQuery = `update cdbm.dealer_master ` +
                ` set st_change_dt = clock_timestamp() ` +
                ` where dealer_cd  = $1 and status != $2;`;

                await pool.query(stsValQuery, [dealerCode, dealerstatus]);
            }

            

            lv_dealer_cd = dealerCode;
            lv_upd_statement = `update cdbm.dealer_master 
                              set opening_date = to_date($1, 'YYYY-MM-DD'), dealer_name = $2, dealer_alias = $3, activity_cd = $4, 
                                  status = $5, pan = $6, it_ward_no = $7, tds_rate = $8, order_limit = $9, 
                                  gross_limit = $10, net_limit = $11, upd_user_id = $12, upd_date = clock_timestamp()
                            where dealer_cd = $13;`;

            await pool.query(lv_upd_statement, [openingdate, dealername, aliasname, activityCode, dealerstatus, dealerPAN
                , wardno, tdsrate, orderlmt, grosslmt, netlmt, userId, lv_dealer_cd]);
        }
        await pool.query('COMMIT');
        res.json({ message: lv_dealer_cd });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting dealer master:', error);
        res.status(500).send('Error inserting dealer master. Please try again.');
    }
});


deal_sub_deal_router.post('/save_sub_dealer', async (req, res) => {
    const { header } = req.body;
    const { p_Dealer_Code, subdealerCode, subdealername, subdealeralias, sdstatus, statuschangedate, userId, editMode } = header;
    console.log('header ', header);
    try {
        await pool.query('BEGIN');
        if (editMode) {
            const dbStatus = (await pool.query(`select status from cdbm.sub_dealer where dealer_cd = $1 and sub_dealer_cd = $2;`
                , [p_Dealer_Code, subdealerCode])).rows[0].status;

            if (dbStatus !== sdstatus) {
                const stsValQuery = ` update cdbm.sub_dealer  set st_change_dt = clock_timestamp() ` +
                    `where dealer_cd = $1 and sub_dealer_cd = $2 and status != $3;`;

                await pool.query(stsValQuery, [p_Dealer_Code, subdealerCode, sdstatus]);
            }

            const update_query = 'UPDATE CDBM.SUB_DEALER SET sub_dealer_name = $1, sub_dealer_alias = $2, status = $3, upd_user_id = $4 ' +
                ', upd_date = clock_timestamp() WHERE dealer_cd = $5 and sub_dealer_cd = $6;';

            await pool.query(update_query, [subdealername, subdealeralias, sdstatus, userId, p_Dealer_Code, subdealerCode]);
        }
        else {
            const insert_query = 'INSERT INTO CDBM.SUB_DEALER (dealer_cd, sub_dealer_name, sub_dealer_alias, status, st_change_dt' +
                ', add_user_id, add_date) VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp());';

            await pool.query(insert_query, [p_Dealer_Code, subdealername, subdealeralias, sdstatus, statuschangedate || null, userId]);
        }
        await pool.query('COMMIT');
        res.json({ message: 'Data saved successfully' });
    }
    catch (error) {
        await pool.query('ROLLBACK');
        console.log(error);
        res.status(500).send('Error saving Sub Dealer. Please try again.')
    }
});

deal_sub_deal_router.get('/get_sub_dealer', async (req, res) => {
    try {
        const { p_Dealer_Code } = req.query;
        const query = `SELECT sub_dealer_cd, sub_dealer_name, sub_dealer_alias, status, to_char(st_change_dt, 'yyyy-MM-dd') st_change_dt ` +
            `FROM CDBM.SUB_DEALER ` +
            `WHERE dealer_cd = $1 ORDER BY sub_dealer_name;`;

        const result = await pool.query(query, [p_Dealer_Code]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).send('Error saving Sub Dealer. Please try again.')
    }
});

deal_sub_deal_router.post('/save_sub_exchange_link', async (req, res) => {
    try {
        await pool.query('BEGIN');

        const { header } = req.body;
        const { dealerCode, subdealerCode, activityCode, exchange, segment, userId } = header;

        const val_query = `select a.mii_id, b.mii_name exc_name, a.seg_code, c.seg_name, a.activity_cd, d.act_name ` +
            `from CDBM.SUB_DEALER_EXC_LINK a ` +
            `join cdbm.mii_master b on b.mii_id = a.mii_id ` +
            `join cdbm.segment_master c on c.seg_code = a.seg_code ` +
            `join cdbm.activity_master d on d.activity_cd = a.activity_cd ` +
            `where a.sub_dealer_cd = $1 and a.dealer_cd = $2 and a.mii_id = $3 and a.seg_code = $4 and a.activity_cd = $5;`;

        const val = await pool.query(val_query, [subdealerCode, dealerCode, exchange, segment, activityCode]);
        if (val.rowCount > 0) {
            res.json({ message: 'Data already exists' });
        }
        else {
            let query = `INSERT INTO CDBM.SUB_DEALER_EXC_LINK (mii_id, seg_code, activity_cd, sub_dealer_cd, dealer_cd` +
                `, add_user_id, add_date) VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp());`;

            await pool.query(query, [exchange, segment, activityCode, subdealerCode, dealerCode, userId]);
            await pool.query('COMMIT');
            res.json({ message: 'Data saved successfully' });
        }
    } catch (error) {
        await pool.query('ROLLBACK');
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.get('/get_sub_dealer_exchange', async (req, res) => {
    try {
        const { p_Dealer_Code, s_Dealer_Code } = req.query;

        const query = `select a.mii_id, b.mii_name exc_name, a.seg_code, c.seg_name, a.activity_cd, d.act_name ` +
            `from CDBM.SUB_DEALER_EXC_LINK a ` +
            `join cdbm.mii_master b on b.mii_id = a.mii_id ` +
            `join cdbm.segment_master c on c.seg_code = a.seg_code ` +
            `join cdbm.activity_master d on d.activity_cd = a.activity_cd ` +
            `where a.sub_dealer_cd = $1 and a.dealer_cd = $2;`;

        const result = await pool.query(query, [s_Dealer_Code, p_Dealer_Code]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

deal_sub_deal_router.post('/save_sub_dealer_sharing', async (req, res) => {
    try {
        await pool.query('BEGIN');

        const { header } = req.body;
        const { p_Dealer_Code, s_Dealer_Code, exc_Code, seg_Code, act_Code, slabCode, dateFrom, dateTo, userId, editMode } = header;

        if (editMode) {
            const updateQuery = `UPDATE CDBM.CASH_BILL_SHARING_BRANCH_LINK SET DATE_TO = $1, UPD_USER_ID = $2, UPD_DATE = CLOCK_TIMESTAMP() ` +
                `WHERE DEALER_CD = $3 AND SUB_DEALER_CD = $4 AND MII_CD = $5 AND SEG_CODE = $6 AND ACTIVITY_CODE = $7 AND BR_SLAB_ID = $8;`;

            await pool.query(updateQuery, [dateTo || null, userId, p_Dealer_Code, s_Dealer_Code, exc_Code, seg_Code, act_Code, slabCode]);

            await pool.query('COMMIT');
            res.json({ message: 'Data saved successfully' });
        }
        else {
            const valQuery = `SELECT 1 FROM CDBM.CASH_BILL_SHARING_BRANCH_LINK ` +
                `WHERE DEALER_CD = $1 AND SUB_DEALER_CD = $2 AND MII_CD = $3 AND SEG_CODE = $4 AND ACTIVITY_CODE = $5 AND BR_SLAB_ID = $6;`;

            const valData = await pool.query(valQuery, [p_Dealer_Code, s_Dealer_Code, exc_Code, seg_Code, act_Code, slabCode]);

            if (valData.rowCount > 0) {
                res.json({ message: 'Slab Already Exists' });
            }
            else {
                const query = `INSERT INTO CDBM.CASH_BILL_SHARING_BRANCH_LINK (DEALER_CD, SUB_DEALER_CD, MII_CD, SEG_CODE, ACTIVITY_CODE, BR_SLAB_ID ` +
                    `, DATE_FROM, DATE_TO, ADD_USER_ID, ADD_DATE) ` +
                    `VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, clock_timestamp());`;

                await pool.query(query, [p_Dealer_Code, s_Dealer_Code, exc_Code, seg_Code, act_Code, slabCode, dateFrom, dateTo || null, userId]);

                await pool.query('COMMIT');
                res.json({ message: 'Data saved successfully' });
            }
        }
    }
    catch (error) {
        res.status(500).send('Error saving sub dealer sharing. Please try after sometime');
    }
});

deal_sub_deal_router.get('/get_sub_dealer_sharing', async (req, res) => {
    try {
        const { p_Dealer_Code, s_Dealer_Code, exc_Code, seg_Code, act_Code } = req.query;

        const query = `SELECT B.ALIAS, TO_CHAR(A.DATE_FROM, 'yyyy-MM-dd') DATE_FROM, TO_CHAR(A.DATE_TO, 'yyyy-MM-dd') DATE_TO, A.BR_SLAB_ID ` +
            `FROM CDBM.CASH_BILL_SHARING_BRANCH_LINK A ` +
            `JOIN CDBM.SUB_DEALER_SLAB_MASTER B ON B.BR_SLAB_ID = A.BR_SLAB_ID ` +
            `WHERE DEALER_CD = $1 AND SUB_DEALER_CD = $2 AND MII_CD = $3 AND SEG_CODE = $4 AND ACTIVITY_CODE = $5 ` +
            `ORDER BY B.BR_SLAB_NAME;`;

        const result = await pool.query(query, [p_Dealer_Code, s_Dealer_Code, exc_Code, seg_Code, act_Code]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).send(error.message);
    }
});


deal_sub_deal_router.get('/search_BankBranches', async (req, res) => {
    const { branchname, bankname, addr1 } = req.query;
    let queryParams = [];
    let query = `SELECT addr_id, branch_name, addr_for bank_name, addr_line1 FROM cdbm.address_master WHERE addr_type='BANK'`;

    query += ` AND UPPER(branch_name) LIKE UPPER('%` + branchname + `%')`;
    query += ` AND UPPER(addr_for) LIKE UPPER('%` + bankname + `%')`;
    query += ` AND UPPER(addr_line1) LIKE UPPER('%` + addr1 + `%')`;

    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


deal_sub_deal_router.get('/get_addresses', async (req, res) => {
    const { p_addr_type, p_parent_id } = req.query;

    let query = `SELECT addr_id, addr_type, addr_for, branch_name, micr, addr_line1, addr_line2, addr_line3, ` +
        ` city, pin, phone1, phone2, phone3, email_id, website, status ` +
        ` FROM cdbm.address_master WHERE UPPER(addr_type) = UPPER($1) and parent_id = $2;`;
    try {
        const result = await pool.query(query, [p_addr_type, p_parent_id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.message);
        res.status(500).send('Server error');
    }
});

deal_sub_deal_router.get('/get_cont_persons', async (req, res) => {
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

deal_sub_deal_router.post('/save_dealer_addr_contacts', async (req, res) => {
    const { header, details } = req.body;
    const { p_parent_id, addrId, branchname, addrfor, addrLine1, addrLine2, addrLine3, city, pin, phone1, phone2, phone3,
        email, website, addrstatus, addrtype, userId } = header;

    try {
        await pool.query('BEGIN');

        var lv_statement = '';
        var lv_cont_person_inst_up = '';
        var lv_cont_pers_id = 0;

        if (!addrId) {
            const max_result = await pool.query(`SELECT coalesce(max(addr_id), 0) + 1  max_no FROM cdbm.address_master;`);
            var lv_addr_id = max_result.rows[0].max_no;
            lv_statement = `Insert into cdbm.address_master (parent_id, addr_id, addr_type, addr_for, branch_name, addr_line1, addr_line2 ` +
                `, addr_line3, city, pin, phone1, phone2, phone3, email_id, website, status, add_user_id, add_date) ` +
                ` values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, clock_timestamp());`;
            await pool.query(lv_statement, [p_parent_id, lv_addr_id, addrtype, addrfor, branchname, addrLine1, addrLine2, addrLine3,
                city, pin, phone1, phone2, phone3, email, website, addrstatus, userId]);
        }
        else {
            lv_addr_id = addrId;
            lv_statement = `Update cdbm.address_master ` +
                ` set addr_for = $1, branch_name = $2, addr_line1 = $3, addr_line2 = $4, addr_line3 = $5, ` +
                `  city = $6, pin = $7, phone1 = $8, phone2 = $9, phone3 = $10, email_id = $11, website = $12,` +
                `  status = $13, upd_user_id = $14, upd_date = clock_timestamp() ` +
                ` WHERE parent_id = $15 and addr_id = $16 and (` +
                `      addr_for != $1 or branch_name != $2 or addr_line1 != $3 or addr_line2 != $4 or addr_line3 != $5 or ` +
                `  city != $6 or pin != $7 or phone1 != $8 or phone2 != $9 or phone3 != $10 or email_id != $11 or website != $12 ` +
                `  or status != $13);`
            await pool.query(lv_statement, [addrfor, branchname, addrLine1, addrLine2, addrLine3, city, pin,
                phone1, phone2, phone3, email, website, addrstatus, userId, p_parent_id, addrId]);
        }

        for (let detail of details) {
            const { cont_pers_id, contact_person, designation, department, cont_pers_mobile, cont_pers_phone, extn, cont_pers_email1, cont_pers_email2 } = detail;
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
                await pool.query(lv_cont_person_inst_up, [contact_person, designation, department, cont_pers_email1, cont_pers_email2,
                    cont_pers_mobile, cont_pers_phone, extn, userId, cont_pers_id, lv_addr_id]);
            }

        } /// end of for loop

        lv_statement = '';

        await pool.query('COMMIT');
        res.json({ message: '' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting address/contact person:', error);
        res.status(500).send('Error inserting address/contact person. Please try again.');
    }
});


module.exports = deal_sub_deal_router;
