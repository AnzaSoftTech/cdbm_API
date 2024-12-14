const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const act_mast_router = express.Router();
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

act_mast_router.post('/save_activity_master', async (req, res) => {
    try {
        const { header } = req.body;
        const { actCode, actName, userId, editMode } = header;

        await pool.query(`begin;`);

        const maxResult = await pool.query(`select coalesce(max(activity_cd), 0)+1 max_no from cdbm.activity_master;`);

        var actCd = maxResult.rows[0].max_no;

        if (editMode === 'N') {
            const query = `insert into cdbm.activity_master (activity_cd, act_name, add_by, add_date) ` +
                `values ($1, $2, $3, clock_timestamp());`;

            await pool.query(query, [actCd, actName, userId]);
            res.json({ message: actCd });
        }
        else {
            actCd = actCode;
            const query = `update cdbm.activity_master set act_name = $1, upd_by = $2, upd_date = clock_timestamp() ` +
                `where activity_cd = $3;`;

            await pool.query(query, [actName, userId, actCode]);
            res.json({ message: actCd });
        }
        await pool.query(`commit`);
    }
    catch (error) {
        await pool.query(`rollback`);
        console.log(error.message);
        res.status(500).send(error.message);
    }
});

act_mast_router.get('/get_activities', async (req, res) => {
    try {
        const query = `select a.activity_cd, a.act_name from cdbm.activity_master a order by act_name;`;

        const result = await pool.query(query);
        res.json(result.rows);
    }
    catch (error) {
        console.log(error.message);
        res.status(500).send(error.message);
    }
});

act_mast_router.get('/ddl_segment_master', async (req, res) => {
    try {
        let query = `SELECT seg_code, seg_name ` +
            ` FROM cdbm.segment_master order by seg_code; `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        // logError(error, req);
        // console.log('ddl_segment_master >>', error)
        res.status(500).send(error.message);
    }
});

module.exports = act_mast_router;
