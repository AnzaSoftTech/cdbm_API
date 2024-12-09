const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const family_group_routes = express.Router();
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

family_group_routes.post('/save_family_grp', async (req, res) => {
    const { header } = req.body;
    const { famGrpCode, famGrp, userId } = header;

    //console.log('req.body ====> ', req.body);

    try {
        await pool.query('BEGIN');

        const max_result = await pool.query(`SELECT coalesce(max(fam_grp_cd), 0) + 1  max_no FROM cdbm.family_grp;`);
        var lv_fam_no = max_result.rows[0].max_no;

        // var lv_statement = '';
        if (!famGrpCode) {
            lv_statement = `Insert into cdbm.family_grp (fam_grp_cd, fam_grp_name, add_user_id, add_date) ` +
                ` values ($1, $2, $3, clock_timestamp());`;
            await pool.query(lv_statement, [lv_fam_no, famGrp, userId]);
            lv_fam_no++;
        }
        else {
            lv_statement = `update cdbm.family_grp ` +
                ` set fam_grp_name = $1, upd_user_id = $2, upd_date = clock_timestamp() ` +
                ` where fam_grp_cd = $3 `;
            await pool.query(lv_statement, [famGrp, userId, famGrpCode]);
        }
        await pool.query('COMMIT');
        //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
        res.json({ message: lv_fam_no });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting family grp:', error);
        res.status(500).send('Error inserting family grp(s). Please try again.');
    }
});

family_group_routes.get('/search_family_grp', async (req, res) => {
    const { p_fam_grp } = req.query;

    let query = `SELECT fam_grp_name, add_date, upd_date, fam_grp_cd ` +
        ` FROM cdbm.family_grp WHERE UPPER(fam_grp_name) like UPPER('%` + p_fam_grp + `%') ;`;
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

family_group_routes.get('/search_family_grp_ById', async (req, res) => {
    const { p_fam_grp_cd } = req.query;

    let query = `SELECT  fam_grp_cd, fam_grp_name ` +
        `FROM cdbm.family_grp WHERE fam_grp_cd = '` + p_fam_grp_cd + `';`;

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

family_group_routes.get('/get_client_name', async (req, res) => {
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

family_group_routes.get('/search_cliName_frm_client_master', async (req, res) => {
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

family_group_routes.post('/upd_client_link', async (req, res) => {
    const { header } = req.body;
    const { clientCd, p_fam_id } = header;

    try {
        await pool.query('BEGIN');

        lv_statement = `UPDATE cdbm.client_master ` +
            ` SET family_id = ${p_fam_id} ` +
            ` WHERE client_cd = '${clientCd}' ;`;
        await pool.query(lv_statement);

        await pool.query('COMMIT');
        res.json({ message: p_fam_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating CLIENT LINK:', error);
        res.status(500).send('Error updating CLIENT LINK(s). Please try again.');
    }
});

family_group_routes.post('/upd_client_links', async (req, res) => {
    const { params, header } = req.body;
    const { cliNameRes } = header;
    const { p_family_id } = params;
    console.log('cliNameRes----1', cliNameRes);

    try {
        await pool.query('BEGIN');

        for (let cliName of cliNameRes) {
            const { client_cd, cli_cd } = cliName;
            console.log(cliName + '----2');

            // Use parameterized queries to prevent SQL injection
            const lv_statement = `UPDATE cdbm.client_master SET family_id = $1 WHERE client_cd = $2;`;
            await pool.query(lv_statement, [p_family_id, client_cd || cli_cd]);
        }

        await pool.query('COMMIT'); // Commit after all updates
        res.json({ message: p_family_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating CLIENT LINK:', error);
        res.status(500).send('Error updating CLIENT LINK(s). Please try again.');
    }
});

family_group_routes.post('/delete_client_link', async (req, res) => {
    const { p_delCli_cd } = req.body;
    const { code } = p_delCli_cd;

    try {
        await pool.query('BEGIN');
        // Use parameterized queries to prevent SQL injection
        const lv_statement = `UPDATE cdbm.client_master SET family_id = 0 WHERE client_cd = '${code}';`;
        await pool.query(lv_statement);

        await pool.query('COMMIT'); // Commit after all updates
        res.json({ message: code });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error deleting CLIENT LINK:', error);
        res.status(500).send('Error deleting CLIENT LINK. Please try again.');
    }
});

family_group_routes.post('/delete_client_links', async (req, res) => {
    const { p_delCli_cd } = req.body;
    const { p_fam_id } = p_delCli_cd;

    try {
        await pool.query('BEGIN');
        // Use parameterized queries to prevent SQL injection
        const lv_statement = `UPDATE cdbm.client_master SET family_id = 0 WHERE family_id = ${p_fam_id};`;
        await pool.query(lv_statement);

        await pool.query('COMMIT'); // Commit after all updates
        res.json({ message: p_fam_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error deleting CLIENT LINKS:', error);
        res.status(500).send('Error deleting CLIENT LINKS. Please try again.');
    }
});

family_group_routes.get('/get_linked_client', async (req, res) => {
    const { p_client_name, p_family_code } = req.query;
    try {

        let query = `SELECT client_cd, name, family_id ` +
            ` FROM cdbm.client_master WHERE family_id = ${p_family_code}; `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        //logError(error, req);
        console.log('ddl_segment_master error :', error);
        res.status(500).send(error.message);
    }
});

module.exports = family_group_routes;
