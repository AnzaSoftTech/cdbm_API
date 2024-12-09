const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const client_link_slab_routes = express.Router();
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

client_link_slab_routes.post('/save_cli_link_slab', async (req, res) => {
    const { header } = req.body;

    //// Destructure necessary fields from brokDetData
    const { clientCd, segment, actCode, exchange, norBrokTrade, scripBrokTrade,
        dayBrokTrade, minBrokTrade, minBrokSqup, minBrokDel, squpChecks,
        phyDel, dematDel, rndOffLimit, rndOffBrok, servTaxExclu,
        stampDutyExclu, transChargesExclu, sebiTurnoverExclu, clearChargesExclu,
        otherChargesExclu, chqReturnPen, lateDelPen, delayedPayPen,
        shortDelPen, badDelPen, comObjPen, orderLmt, grossLmt,
        netLmt, emailDel, mailDel, faxDel, courierDel, handDel, billY_N, billNor,
        billContrWise, billScrWise, billTrans, contrY_N, contrWHConfig, contrTradeWise,
        contrScrWise, contrRateWise, contrPrint, contrNor, contrConsoli, userId, branchCd
    } = header;

    try {
        const getCnt = ` SELECT count(1) AS row_cnt FROM cdbm.client_exc_link WHERE branch_cd = $1 
                        AND client_cd = $2 AND cmp_cd = $3 AND exc_cd = $4 AND segment = $5; `;
        result = await pool.query(getCnt, [branchCd, clientCd, actCode, exchange, segment]);
        var row_cnt = result.rows[0].row_cnt;

        if (row_cnt > 0) {
            res.json({ message: 'This row already exists in the table!' });
            return;
        }
        /// Your SQL INSERT statement
        // console.log('userId====',userId);
        const brokDetDataQuery = `
            INSERT INTO cdbm.CLIENT_EXC_LINK ( branch_cd, client_cd, cmp_cd, exc_cd, segment, 
               late_delivery_rate, short_del, bad_del, comp_obj, ord_lmt, trd_lmt, net_exposure,
               br_normal, br_scrip, min_brok_trans, min_brok_del, min_brok_squp, 
               osdsb, delivery_phy, delivery_dmt, rnd_off_brokerage, rnd_off_lmt,
               service_tax_incl, stamp_duty_incl, trans_chrg_incl, sebi_turn_over,
               clearing_chg, other_chrg_incl, print_contract, print_bill, nor_contract, 
               consoli_cont, print_sp_contract, wh_confirm, contract_scrip_wise, sp_trade_wise, 
               sp_rate_wise, norm_bill, bill_trans_wise, bill_scrip_wise, bill_contract_wise, 
               send_mode_email, send_mode_mail, send_mode_fax, send_mode_courier, send_mode_hand,
               day_trader, add_user_id, add_date
            
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
             $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 
             $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, clock_timestamp());
  
        `;

        const brokDetDataVal = [
            branchCd, clientCd, actCode, exchange, segment, lateDelPen, shortDelPen, badDelPen,
            comObjPen, orderLmt, grossLmt, netLmt, norBrokTrade, scripBrokTrade, minBrokTrade, minBrokDel, minBrokSqup,
            squpChecks, phyDel, dematDel, rndOffBrok, rndOffLimit,
            servTaxExclu, stampDutyExclu, transChargesExclu, sebiTurnoverExclu,
            clearChargesExclu, otherChargesExclu, contrY_N, billY_N, contrNor, contrConsoli, contrPrint,
            contrWHConfig, contrScrWise, contrTradeWise, contrRateWise, billNor, billTrans, billScrWise, billContrWise,
            emailDel, mailDel, faxDel, courierDel, handDel, dayBrokTrade, userId
        ];


        console.log('brokDetDataVal--------', brokDetDataVal);
        await pool.query(brokDetDataQuery, brokDetDataVal);
        res.json({ message: '' });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ error: 'An error occurred while saving data' });
    }
});

client_link_slab_routes.post('/save_cli_slab_attach', async (req, res) => {
    const { header } = req.body;

    //// Destructure necessary fields from brokDetData
    const { branchCode, cliCd, act, exc, seg, slabId, dateApp, dateTo } = header;

    try {
        const getCount = ` SELECT count(1) AS row_cnt FROM cdbm.client_brokerage_slab WHERE branch_cd = $1 
                        AND client_cd = $2 AND cmp_cd = $3 AND exc_cd = $4 AND segment = $5; `;
        result = await pool.query(getCount, [branchCode, cliCd, act, exc, seg]);
        var lv_row_cnt = result.rows[0].row_cnt;

        if (lv_row_cnt > 0) {
            let dateTo = new Date(dateApp);
            dateTo.setDate(dateTo.getDate() - 1);
            let Date_to = dateTo.toISOString().split('T')[0];
            const lv_statement = `UPDATE cdbm.client_brokerage_slab SET date_to = '` + Date_to + ` 00:00:00' 
                          WHERE branch_cd = $1 
                        AND client_cd = $2 AND cmp_cd = $3 AND exc_cd = $4 AND segment = $5 AND date_to IS NULL;`;
            await pool.query(lv_statement, [branchCode, cliCd, act, exc, seg]);
        }

        /// Your SQL INSERT statement
        // console.log('userId====',userId);
        const cliSlabAttachDataQuery = `
            INSERT INTO cdbm.client_brokerage_slab ( branch_cd, client_cd, cmp_cd, exc_cd, 
               segment, mslab_code, date_applicable, date_to           
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `;

        const cliSlabAttachDataVal = [branchCode, cliCd, act, exc, seg, slabId, dateApp, dateTo || null];

        console.log('cliSlabAttachDataVal--------', cliSlabAttachDataVal);
        await pool.query(cliSlabAttachDataQuery, cliSlabAttachDataVal);
        res.json({ message: '' });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ error: 'An error occurred while saving data' });
    }
});

client_link_slab_routes.get('/get_client_slab_attach/:clientcd', async (req, res) => {

    const { clientcd } = req.params;
    const query = `SELECT cbs.mslab_code, cbsm.slab_name slab_name , cbs.date_applicable, cbs.date_to
                   FROM cdbm.client_brokerage_slab cbs JOIN cdbm.cash_bill_slab_master cbsm 
                   ON cbs.mslab_code = cbsm.slab_id
                   WHERE client_cd = $1;`;

    try {
        const result = await pool.query(query, [clientcd]);
        if (result.rows.length === 0) {
            return res.json(result.rows);
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching client slab attachment data:', error);
        res.status(500).send('Error fetching data');
    }
});

client_link_slab_routes.get('/get_client_name', async (req, res) => {
    const { p_client_cd } = req.query;

    let query = `SELECT  DISTINCT client_cd , name` +
        ` FROM cdbm.client_master WHERE client_cd = '` + p_client_cd + `';`;
    try {
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.message);
        res.json(result.rows);
    }
});

client_link_slab_routes.get('/get_client_link_slab/:client_cd', async (req, res) => {

    const { client_cd } = req.params;
    const query = `SELECT cel.client_cd, cm.name client_name , cel.segment, cel.cmp_cd, cel.exc_cd, 
                   cel.br_normal, cel.br_scrip, cel.day_trader, cel.osdsb, cel.min_brok_trans, cel.min_brok_squp,
                   cel.min_brok_del, cel.delivery_phy, cel.delivery_dmt, cel.service_tax_incl, cel.stamp_duty_incl,
                   cel.trans_chrg_incl, cel.sebi_turn_over, cel.clearing_chg, cel.other_chrg_incl,
                   cel.rnd_off_brokerage, cel.rnd_off_lmt, cel.late_delivery_rate, cel.short_del, cel.bad_del,
                   cel.comp_obj , cel.ord_lmt, cel.trd_lmt, cel.net_exposure, cel.send_mode_email, cel.send_mode_mail,
                   cel.send_mode_fax, cel.send_mode_courier, cel.send_mode_hand, cel.print_bill, cel.norm_bill, 
                   cel.bill_trans_wise, cel.bill_scrip_wise, cel.bill_contract_wise , cel.print_contract, cel.nor_contract,
                   cel.consoli_cont, cel.print_sp_contract, cel.wh_confirm, cel.contract_scrip_wise, cel.sp_trade_wise, cel.sp_rate_wise
                   FROM cdbm.CLIENT_EXC_LINK cel 
                   JOIN cdbm.client_master cm ON cel.client_cd = cm.client_cd WHERE cel.client_cd = $1;`;

    try {
        const result = await pool.query(query, [client_cd]);
        if (result.rows.length === 0) {
            return res.json(result.rows);
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching client slab data:', error);
        res.status(500).send('Error fetching data');
    }
});

client_link_slab_routes.get('/ddl_segment_master', async (req, res) => {
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

client_link_slab_routes.get('/ddl_brok_slabs', async (req, res) => {
    try {

        let query = `SELECT slab_id, slab_name ` +
            ` FROM cdbm.cash_bill_slab_master order by slab_id; `;

        const result = await pool.query(query);

        //console.log('result of segment ddl....', result);
        res.json(result.rows);

    } catch (error) {
        // logError(error, req);
        console.log('error ....', error);
        res.status(500).send(error.message);
    }
});

client_link_slab_routes.get('/ddl_activity_master', async (req, res) => {
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

client_link_slab_routes.get('/exchange_ddl', async (req, res) => {
    let query = ` SELECT mii_id, mii_short_name FROM cdbm.mii_master WHERE mii_catg='EXC'; `;

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

client_link_slab_routes.get('/search_cliName_frm_client_master', async (req, res) => {
    const { p_cli_name } = req.query;
    console.log('body', req.body);
    // let queryParams = [];
    let query = `SELECT client_cd , name FROM cdbm.client_master 
                 WHERE UPPER(name) LIKE UPPER('%` + p_cli_name + `%');`;
    try {
        //const result = await pool.query(query, queryParams);
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = client_link_slab_routes;
