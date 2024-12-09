const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const doc_mapp_master_routes = express.Router();
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

doc_mapp_master_routes.post('/save_doc_mapp_master', async (req, res) => {
    const { header, details } = req.body;
    const { userId } = header;

    //console.log('req.body ====> ', req.body);

    try {
        await pool.query('BEGIN');

        var lv_doc_mapp_inst_up = '';
        var lv_doc_mapp_id = 0;

        //// Start : Doc Mapping Master Insert/Update

        for (let detail of details) {
            const { doc_code, docu_name, docu_type, id_no, place_of_issue,
                issue_date, expiry_date, catg, sub_catg, nse, kyc, ckyc, nsdl, fatca, mand_optn } = detail;
            console.log('document mapping detail ===> ', detail);
            if (docu_name.length) {
                if (!doc_code) {
                    console.log('userId for doc mapp=======', userId);
                    const max_result = await pool.query(`SELECT coalesce(max(doc_code), 0) + 1  max_no FROM cdbm.doc_mapping_master;`);
                    lv_doc_mapp_id = max_result.rows[0].max_no;
                    lv_doc_mapp_inst_up = `insert into cdbm.doc_mapping_master ( ` +
                        `  doc_code, doc_name, doc_type, id_no, place_of_issue, issue_date, expiry_date,` +
                        ` catg, sub_catg, nse, kyc, ckyc, nsdl, fatca, add_user_id, add_date, mand_optn) ` +
                        ` values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, clock_timestamp(), $16) `;
                    await pool.query(lv_doc_mapp_inst_up, [lv_doc_mapp_id, docu_name, docu_type, id_no, place_of_issue,
                        issue_date, expiry_date, catg, sub_catg, nse, kyc, ckyc, nsdl, fatca, userId, mand_optn]);
                }
                // else 
                // {
                //   lv_doc_mapp_inst_up = `update cdbm.cont_person_master  ` +
                //                               ` set cont_pers_name = $1, designation = $2, dept = $3, email_id1 = $4, email_id2 = $5, ` +
                //                               `      mobile = $6, phone = $7, extn = $8, upd_user_id = $9, upd_date = clock_timestamp() ` +
                //                               ` where cont_pers_id = $10 and addr_id = $11 and ` +
                //                                    ` (cont_pers_name != $1 or designation != $2 or dept != $3 or ` +
                //                                    ` email_id1 != $4 or email_id2 != $5 or ` +
                //                               `      mobile != $6 or phone != $7 or extn != $8);`
                //   //console.log('lv_addr_id -> ', lv_addr_id);
                //   // console.log('cont_pers_id -> ', cont_pers_id);
                //    await pool.query(lv_cont_person_inst_up, [contact_person, designation, department, cont_pers_email1, cont_pers_email2, 
                //     cont_pers_mobile, cont_pers_phone, extn, userId, cont_pers_id, lv_addr_id ]);
                // }
            } // end for : if (contact_person)

        } /// end of for loop

        await pool.query('COMMIT');
        res.json({ message: lv_doc_mapp_id });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting doc mapp master:', error);
        res.status(500).send('Error inserting doc mapp master. Please try again.');
    }
});

doc_mapp_master_routes.get('/ddl_catg_doc_mapp', async (req, res) => {
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

doc_mapp_master_routes.get('/ddl_sub_catg_doc_mapp', async (req, res) => {
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

doc_mapp_master_routes.get('/search_doc_mapp_master', async (req, res) => {
    const { p_doc_name } = req.query;

    let query = `SELECT doc.doc_code, doc.doc_name, cm.description desc ` +
        ` FROM cdbm.doc_mapping_master doc JOIN cdbm.common_master cm ON 
       doc.doc_name = cm.comm_id WHERE UPPER(cm.description) like UPPER('%` + p_doc_name + `%');`;

    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.message);
        res.status(500).send('Server error');
    }
});

doc_mapp_master_routes.get('/search_doc_mapp_Master_ById', async (req, res) => {
    const { p_doc_code } = req.query;

    let query = `  SELECT doc_code, doc_name, doc_type, id_no, place_of_issue, 
                   issue_date, expiry_date, catg, sub_catg, nse, kyc, ckyc, nsdl, fatca, mand_optn ` +
        `  FROM cdbm.doc_mapping_master ` +
        `  WHERE doc_code = '` + p_doc_code + `';`;

    try {
        //console.log('search by Id query:--->', query);
        const result = await pool.query(query);
        console.log('result--->', result);
        res.json(result.rows);
        // console.log('Query result:', result.rows);
    } catch (err) {
        console.error('Error executing query:--->', err.message);
        res.status(500).send('Server error');
    }
});

doc_mapp_master_routes.get('/ddl_doc_names', async (req, res) => {
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

module.exports = doc_mapp_master_routes;
