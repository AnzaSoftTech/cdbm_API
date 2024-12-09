const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const client_group_routes = express.Router();
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

client_group_routes.post('/save_cli_grp', async (req, res) => {
    const { header } = req.body;
    const { cliGrpCode, cliGrp, userId } = header;

    //console.log('req.body ====> ', req.body);

    try {
        await pool.query('BEGIN');

        const max_result = await pool.query(`SELECT coalesce(max(cli_grp_cd), 0) + 1  max_no FROM cdbm.client_grp;`);
        var lv_cli_no = max_result.rows[0].max_no;

        // var lv_statement = '';
        if (!cliGrpCode) {
            lv_statement = `Insert into cdbm.client_grp (cli_grp_cd, cli_grp_name, add_user_id, add_date) ` +
                ` values ($1, $2, $3, clock_timestamp());`;
            await pool.query(lv_statement, [lv_cli_no, cliGrp, userId]);
            lv_cli_no++;
        }
        else {
            lv_statement = `update cdbm.client_grp ` +
                ` set cli_grp_name = $1, upd_user_id = $2, upd_date = clock_timestamp() ` +
                ` where cli_grp_cd = $3 `;
            await pool.query(lv_statement, [cliGrp, userId, cliGrpCode]);
        }
        await pool.query('COMMIT');
        //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
        res.json({ message: lv_cli_no });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting client grp:', error);
        res.status(500).send('Error inserting client grp(s). Please try again.');
    }
});

client_group_routes.get('/search_client_grp', async (req, res) => {
    const { p_cli_grp } = req.query;

    let query = `SELECT cli_grp_name, add_date, upd_date, cli_grp_cd ` +
        ` FROM cdbm.client_grp WHERE UPPER(cli_grp_name) like UPPER('%` + p_cli_grp + `%') ;`;
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

client_group_routes.get('/search_cli_grp_ById', async (req, res) => {
    const { p_cli_grp_cd } = req.query;

    let query = `SELECT  cli_grp_cd, cli_grp_name ` +
        `FROM cdbm.client_grp WHERE cli_grp_cd = '` + p_cli_grp_cd + `';`;

    try {
        //console.log('search by Id query:--->', query);
        const result = await pool.query(query);
        res.json(result.rows);
        //  console.log('Query result:', result.rows);
    } catch (err) {
        console.error('Error executing query:--->', err.message);
        res.status(500).send('Server error');
    }
});

client_group_routes.get('/get_client_name', async (req, res) => {
    const { p_client_cd } = req.query;

    let query = `SELECT  DISTINCT client_cd , name` +
        ` FROM cdbm.client_master WHERE client_cd = '` + p_client_cd + `';`;

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

client_group_routes.get('/search_cliName_frm_client_master', async (req, res) => {
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

client_group_routes.post('/upd_client_link', async (req, res) => {
    const { header } = req.body;
    const { clientCd, p_cli_id } = header;

    try {
        await pool.query('BEGIN');

        lv_statement = `UPDATE cdbm.client_master ` +
            ` SET cli_group_code = ${p_cli_id} ` +
            ` WHERE client_cd = '${clientCd}' ;`;
        await pool.query(lv_statement);

        await pool.query('COMMIT');
        res.json({ message: p_cli_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating CLIENT LINK:', error);
        res.status(500).send('Error updating CLIENT LINK(s). Please try again.');
    }
});

client_group_routes.post('/upd_client_links', async (req, res) => {
    const { params, header } = req.body;
    const { cliNameRes } = header;
    const { p_client_id } = params;
    console.log('cliNameRes----1', cliNameRes);

    try {
        await pool.query('BEGIN');

        for (let cliName of cliNameRes) {
            const { client_cd, cli_cd } = cliName;
            console.log(cliName + '----2');

            // Use parameterized queries to prevent SQL injection
            const lv_statement = `UPDATE cdbm.client_master SET cli_group_code = $1 WHERE client_cd = $2;`;
            await pool.query(lv_statement, [p_client_id, client_cd || cli_cd]);
        }

        await pool.query('COMMIT'); // Commit after all updates
        res.json({ message: p_client_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating CLIENT LINK:', error);
        res.status(500).send('Error updating CLIENT LINK(s). Please try again.');
    }
});

client_group_routes.post('/delete_client_link', async (req, res) => {
    const { p_delCli_cd } = req.body;
    const { code } = p_delCli_cd;

    try {
        await pool.query('BEGIN');
        // Use parameterized queries to prevent SQL injection
        const lv_statement = `UPDATE cdbm.client_master SET cli_group_code = 0 WHERE client_cd = '${code}';`;
        await pool.query(lv_statement);

        await pool.query('COMMIT'); // Commit after all updates
        res.json({ message: code });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error deleting CLIENT LINK:', error);
        res.status(500).send('Error deleting CLIENT LINK. Please try again.');
    }
});

client_group_routes.post('/delete_client_links', async (req, res) => {
    const { p_delCli_cd } = req.body;
    const { p_cli_id } = p_delCli_cd;

    try {
        await pool.query('BEGIN');
        // Use parameterized queries to prevent SQL injection
        const lv_statement = `UPDATE cdbm.client_master SET cli_group_code = 0 WHERE cli_group_code = ${p_cli_id};`;
        await pool.query(lv_statement);

        await pool.query('COMMIT'); // Commit after all updates
        res.json({ message: p_cli_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error deleting CLIENT LINKS:', error);
        res.status(500).send('Error deleting CLIENT LINKS. Please try again.');
    }
});

client_group_routes.get('/get_linked_client', async (req, res) => {
    const { p_client_name, p_client_code } = req.query;
    try {

        let query = `SELECT client_cd, name, cli_group_code ` +
            ` FROM cdbm.client_master WHERE cli_group_code = ${p_client_code}; `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        //logError(error, req);
        console.log('ddl_segment_master error :', error);
        res.status(500).send(error.message);
    }
});

module.exports = client_group_routes;
