const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const deal_slab_router = express.Router();
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

deal_slab_router.post('/save_sharing_slab', async (req, res) => {
    try {
        const { header } = req.body;
        const { sharingSlabId, sharingSlab, sharingAlias, dateFrom, dateTo, userId, editMode } = header;
        var brSlabId = 0;

        await pool.query(`begin;`);

        if (editMode === 'N') {
            const maxResult = await pool.query(`select coalesce(max(br_slab_id), 0) + 1 max_no from cdbm.der_bill_sharing_branch;`);
            var brSlabId = maxResult.rows[0].max_no;

            const query = `insert into cdbm.der_bill_sharing_branch (br_slab_id, br_slab_name, alias, date_app, date_to, add_user_id, add_date) ` +
                `values ($1, $2, $3, $4, $5, $6, clock_timestamp());`

            await pool.query(query, [brSlabId, sharingSlab, sharingAlias, dateFrom, dateTo || null, userId]);
        }
        else {
            var brSlabId = sharingSlabId;
            const query = `update cdbm.der_bill_sharing_branch set br_slab_name = $1, alias = $2, date_app = $3, date_to = $4 ` +
                `, upd_user_id = $5, upd_date = clock_timestamp() where br_slab_id = $6`;

            await pool.query(query, [sharingSlab, sharingAlias, dateFrom, dateTo || null, userId, sharingSlabId]);
        }
        await pool.query('commit;');
        res.json({ message: brSlabId });
    }
    catch (error) {
        await pool.query(`rollback;`);
        res.status(500).send(error.message);
    }
});

deal_slab_router.get('/get_sharing_slabs', async (req, res) => {
    try {
        // const { brSlabId } = req.query;
        const query = `select br_slab_id, br_slab_name, alias, to_char(date_app, 'yyyy-MM-dd') date_app, to_char(date_to, 'yyyy-MM-dd') date_to ` +
            `from cdbm.der_bill_sharing_branch order by br_slab_name;`;

        const result = await pool.query(query);

        res.json(result.rows);
    }
    catch (error) {
        res.status(500).send(error.message);
    }
});

deal_slab_router.get('/validation', async (req, res) => {
    try {
        const { sharingSlabId, dateFrom, editMode } = req.query;

        if (editMode === 'false') {
            var resp = 0;

            const isEndDate = await pool.query(`select count(1) cnt from cdbm.der_bill_sharing_branch_det where br_slab_id = $1 and date_to is null;`
                , [sharingSlabId]
            );

            if (isEndDate.rows[0].cnt === '0') {
                const isEnd = await pool.query(`select count(1) cnt from (select max(date_to) max_date 
                                              from cdbm.der_bill_sharing_branch_det where br_slab_id = $1) tmp
                                                 where tmp.max_date > to_date($2, 'yyyy-MM-dd')`, [sharingSlabId, dateFrom]);

                if (isEnd.rows[0].cnt > 0) {
                    resp = 2;
                }
                else {
                    resp = 3;
                }
            }
            else {
                const isExists = await pool.query(`select count(1) cnt from (select max(date_app) max_date 
            from cdbm.der_bill_sharing_branch_det where br_slab_id = $1) tmp
                where tmp.max_date >= to_date($2, 'yyyy-MM-dd')`, [sharingSlabId, dateFrom]);

                if (isExists.rows[0].cnt > 0) {
                    resp = 1;
                }
                else {
                    resp = 3;
                }
            }
        }
        else {
            resp = 3;
        }
        res.json(resp);
    }
    catch (error) {
        console.log('error in validation ', error);
        res.status(500).send(error.message);
    }
});

deal_slab_router.post('/save_sharing_percentage', async (req, res) => {
    try {
        const { header } = req.body;
        const { sharingSlabId, brBrokerage, dlBrokerage, genCharge, dateFrom, dateTo, brSlDetNo, userId, editMode } = header;

        await pool.query(`begin;`);

        if (editMode) {
            const lstSlDetNo = brSlDetNo;
            const updateQuery = `update cdbm.der_bill_sharing_branch_det set date_to = $1, upd_user_id = $2, upd_date = clock_timestamp() ` +
                `where br_sl_det_no = $3;`;
            await pool.query(updateQuery, [dateTo || null, userId, lstSlDetNo]);
        }
        else {
            const isExists = await pool.query(`select count(1) row_count from cdbm.der_bill_sharing_branch_det where br_slab_id = $1;`,
                [sharingSlabId]);

            //maxResult.rows[0].row_count
            if (isExists.rows[0].row_count > 0) {
                const date = new Date(dateFrom);
                date.setDate(date.getDate() - 1);
                const endDate = date.toISOString().split("T")[0];

                const maxNo = await pool.query(`select max(br_sl_det_no) max_no from cdbm.der_bill_sharing_branch_det where br_slab_id = $1;`
                    , [sharingSlabId]);

                const lstSlDetNo = maxNo.rows[0].max_no;

                const isEndDate = (await pool.query(`select date_to from cdbm.der_bill_sharing_branch_det where br_sl_det_no = $1;`, [lstSlDetNo]))
                    .rows[0].date_to

                if (isEndDate === null) {
                    const endDateUpdQuery = `update cdbm.der_bill_sharing_branch_det set date_to = $1, upd_user_id = $2 ` +
                        `, upd_date = clock_timestamp() where br_sl_det_no = $3;`;
                    await pool.query(endDateUpdQuery, [endDate, userId, lstSlDetNo]);
                }
            }

            const maxResult = await pool.query(`select coalesce(max(br_sl_det_no), 0) + 1 max_no from cdbm.der_bill_sharing_branch_det;`);
            const brSlDetNo = maxResult.rows[0].max_no;

            const query = `insert into cdbm.der_bill_sharing_branch_det (br_slab_id, br_sl_det_no, br_brok, dl_brok, net_off_g_chg, date_app ` +
                `, date_to , add_user_id, add_date) values ($1, $2, $3, $4, $5, $6, $7, $8, clock_timestamp());`;

            await pool.query(query, [sharingSlabId, brSlDetNo, brBrokerage || null, dlBrokerage || null, genCharge, dateFrom, dateTo || null, userId]);
        }

        await pool.query(`commit;`);
        res.json(brSlDetNo);
    }
    catch (error) {
        await pool.query(`rollback;`);
        console.log(error);
        res.status(500).send(error.message);
    }
});

deal_slab_router.get('/get_sharing_percentage', async (req, res) => {
    try {
        const { sharingSlabId } = req.query;

        const query = `select br_sl_det_no, br_brok, dl_brok, net_off_g_chg, to_char(date_app, 'yyyy-MM-dd') date_app` +
            `, to_char(date_to, 'yyyy-MM-dd') date_to from cdbm.der_bill_sharing_branch_det where br_slab_id = $1 order by date_app desc;`;

        const result = await pool.query(query, [sharingSlabId]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).send(error.message);
    }

});

module.exports = deal_slab_router;
