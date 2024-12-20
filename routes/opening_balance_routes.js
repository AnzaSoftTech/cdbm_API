const express = require('express');
const bodyParser = require('body-parser');
const opening_balance_router = express.Router();
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const port = 3001;

// PostgreSQL pool
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "cdbm_db",
//   password: "pg@12345",
//   port: 5432
// });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

app.use(cors());
app.use(bodyParser.json());

// Endpoint to get accounts
// opening_balance_router.get('/bookType', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT book_type FROM cdbm.fin_book_type');
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// opening_balance_router.get('/branches', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT branch_cd,branch_name FROM cdbm.branch_master order by branch_name');
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });

// opening_balance_router.get('/Account', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT act_cd,act_name FROM cdbm.fin_account_master order by act_name');
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });

opening_balance_router.get('/searchOpenBalAccount', async (req, res) => {
    const { activity, segment, name, AccountType, exchange } = req.query;
    let queryParams = [exchange, segment, activity];
    let query = '';
    if (AccountType === 'account') {
        query = `SELECT act_cd, account_name act_name FROM cdbm.fin_account_master WHERE exc_cd = $1 AND segment = $2 AND activity_cd = $3`;
        if (name) {
            query += ' AND account_name ILIKE $4 ORDER BY account_name;';
            queryParams.push(`%${name}%`);
        }
    }
    else {
        query = 'SELECT cb_act_cd, account_title act_name FROM cdbm.fin_cash_bank_master WHERE exc_cd = $1 AND segment = $2 AND cmp_cd = $3';
        if (name) {
            query += ' AND account_title ILIKE $4 ORDER BY account_title;';
            queryParams.push(`%${name}%`);
        }
    }
    try {
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

opening_balance_router.get('/searchOpenBal', async (req, res) => {
    const { finYear, accountType, accountName, } = req.query;

    let query = `select a.fin_year, to_char(a.bal_as_on_date, 'yyyy-MM-dd') bal_as_on_date, a.exc_cd, a.segment, a.activity_cd, ` +
        `${accountType === 'account' ? 'a.act_cd' : 'a.cb_act_cd'} , a.nor_depos, ` +
        `${accountType === 'account' ? 'b.account_name' : 'b.account_title'} account_name` +
        `, a.open_bal_amt, a.drcr from cdbm.fin_open_balance a ` +
        `join ${accountType === 'account' ? 'cdbm.fin_account_master b on b.act_cd = a.act_cd'
            : 'cdbm.fin_cash_bank_master b on b.cb_act_cd = a.cb_act_cd'} ` +
        `where a.fin_year = ${finYear} and ${accountType === 'account' ? 'a.act_cd is not null' : 'a.cb_act_cd is not null'} is not null `

    if (accountName){
        if(accountType === 'account'){
            query += `and upper(b.account_name) like upper('%${accountName}%') order by b.account_name`;
        }
        else{
            query += `and upper(b.account_title) like upper('%${accountName}%') order by b.account_title`;
        }
    }

    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// opening_balance_router.get('/searchVouchersDrCr', async (req, res) => {
//   const { accountName, bookType, fromDate, toDate, tran_type } = req.query;
//   console.log('data====', req.query)
//   let queryParams = [];
//   let query = `SELECT ft.segment, ft.exc_cd, ft.nor_depos, ft.fin_year, ft.branch_cd, ft.cmp_cd, ` +
//     ` ft.voucher_no, ft.book_type, ft.trans_date, fm.account_name,ft.act_cd, ft.amount, ft.drcr, fm.activity_cd ` +
//     ` FROM cdbm.fin_transactions ft join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd   WHERE trans_type= '` + tran_type + `' `;

//   if (accountName) {
//     query += ` AND fm.account_name ilike  '%` + accountName + `%'`;
//   }
//   if (fromDate && toDate) {
//     query += ` and to_date(to_char(ft.trans_date, 'YYYY/MM/DD'), 'YYYY/MM/DD') ` +
//       ` between to_date('` + fromDate + `', 'YYYY/MM/DD') and ` +
//       `      to_date('` + toDate + `', 'YYYY/MM/DD')`
//   }
//   if (bookType) {
//     query += ` AND ft.book_type = '` + bookType + `'`;

//   }
//   query += ` order by ft.trans_date desc, ft.book_type, ft.voucher_no desc `;
//   try {
//     const result = await pool.query(query, queryParams);
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// });

// opening_balance_router.get('/searchEditVoucharDrCr', async (req, res) => {
//   const { segment, nor_depos, fin_year, cmp_cd, voucherNo, bookType, act_cd, branchNamecd, activityCode } = req.query;

//   console.log('voucherNo ', voucherNo);

//   let lv_query = ` SELECT ft.segment, ft.exc_cd, ft.nor_depos, ft.fin_year, ft.voucher_no, ft.book_type, ft.cmp_cd ` +
//     `, (ft.trans_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS trans_date,ft.amount, ft.drcr ` +
//     `, ft.narration,(ft.eff_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS eff_date,ft.narr_code,ft.act_cd,fm.account_name act_name ` +
//     `,ft.d_add_date FROM cdbm.fin_transactions ft join cdbm.fin_account_master fm on fm.act_Cd = ft.act_cd WHERE fin_year = $1 AND ` +
//     `voucher_no = $2 AND book_type = $3 AND ft.segment ilike  '%` + segment + `%' AND ft.nor_depos = $4 ` +
//     `AND fm.activity_cd = $5`;

//   try {
//     const result = await pool.query(lv_query, [fin_year, voucherNo, bookType, nor_depos, activityCode]);
//     console.log(result.rows)
//     res.json(result.rows);
//   } catch (err) {
//     console.error('Error executing query:', err.message);
//     res.status(500).send('Server error');
//   }
// });

// opening_balance_router.get('/fin_company/:voucherDate', async (req, res) => {
//   const { voucherDate } = req.params;
//   console.log('voucharDate----', voucherDate);

//   try {
//     // Fetch fin_year_frm, fin_year_to, and fin_year based on voucherDate
//     const query = `
//     SELECT fin_year 
//     FROM cdbm.fin_company 
//     WHERE to_date($1,'DD/MM/YYYY') BETWEEN 
// to_date(to_char(fin_yr_frm,'DD/MM/YYYY'),'DD/MM/YYYY') AND 
// to_date(to_char(fin_yr_to,'DD/MM/YYYY'),'DD/MM/YYYY')`;

//     const values = [voucherDate];

//     const result = await pool.query(query, values);

//     if (result.rows.length > 0) {
//       res.json(result.rows[0]);
//     } else {
//       res.status(404).send('Financial year data not found for provided voucher date.');
//     }
//   } catch (err) {
//     console.error('Error fetching financial year data:', err);
//     res.status(500).send('Server error');
//   }
// });

opening_balance_router.get('/ddl_exchange', async (req, res) => {
    try {
        const result = await pool.query('SELECT mii_id, mii_name FROM cdbm.mii_master');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

opening_balance_router.get('/ddl_segment', async (req, res) => {
    try {
        const result = await pool.query('SELECT seg_code, seg_name FROM cdbm.segment_master');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

opening_balance_router.get('/ddl_activity_master', async (req, res) => {
    try {
        const { p_segment_cd } = req.query;

        let query = `SELECT activity_cd, act_name  ` +
            ` FROM cdbm.activity_master ` +
            ` WHERE seg_code = '` + p_segment_cd + `'` +
            ` order by activity_cd; `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        // console.log('error  >>>>>', error);
        //  logError(error, req);
        res.status(500).send(error.message);
    }
});

opening_balance_router.get('/get_fin_year', async (req, res) => {
    try{
        const selectResult = await pool.query(`select max(fin_year) fin_year from cdbm.fin_company;`);

        if (selectResult.rows.length === 0) {
            throw new Error('Financial year not found for the provided voucher date');
        }
        const finYear = selectResult.rows[0].fin_year;
        res.json(finYear);
    }
    catch(error){
        console.log(error);
        res.status(500).send(error.message);
    }
});

opening_balance_router.get('/val_fin_year', async (req, res) => {
    const { finYear } = req.query;
    try{
        const selectResult = await pool.query(`select fin_year fin_year from cdbm.fin_company where fin_year = $1;`, [finYear]);
        if (selectResult.rows.length === 0) {
            res.json(null);
            return;
        }
        const dbfinYear = selectResult.rows[0].fin_year;
        res.json(dbfinYear);  
    }
    catch(error){
        console.log(error);
        res.status(500).send(error.message);
    }
});

opening_balance_router.get('/validate_account', async (req, res) => {
    const { data } = req.query;
    const { header, details } = data;
    const { activityCode, segment, normal_deposit, exchange, finYear, asonDate, userId, } = header;
    let query = '';
    let accountName = '';
    
    try{
        for(let detail of details){
            const { account_type, act_cd, act_name, open_bal_amt, dr_cr } = detail;
            if(account_type === 'account'){
                query = `select account_name from cdbm.fin_open_balance a join cdbm.fin_account_master b on a.act_cd = b.act_cd `+
                `where fin_year = $1 and a.act_cd = $2`;
                const selectResult = await pool.query(query, [finYear, act_cd]);
                if (selectResult.rows.length === 0) {
                    continue;
                }
                accountName = selectResult.rows[0].account_name;
                res.json(accountName);
                return; 
            }
            else{
                query = `select account_title from cdbm.fin_open_balance a join cdbm.fin_cash_bank_master b on a.cb_act_cd = b.cb_act_cd `+
                `where fin_year = $1 and a.cb_act_cd = $2;`;
                const selectResult = await pool.query(query, [finYear, act_cd]);
                if (selectResult.rows.length === 0) {
                    continue;
                }
                accountName = selectResult.rows[0].account_title;
                res.json(accountName);
                return; 
            }
        }
        res.json(null);
    }
    catch(error){
        console.log(error);
        res.status(500).send(error.message);
    }
});

opening_balance_router.post('/save_open_bal', async (req, res) => {
    const { header, details } = req.body;
    const { activityCode, segment, normal_deposit, exchange, finYear, asonDate, userId, editMode } = header;

    await pool.query('begin;');

    try {
        let query = '';
        if (editMode === 'N') {
            query = `insert into cdbm.fin_open_balance (fin_year, bal_as_on_date, exc_cd, segment, activity_cd, nor_depos, ` +
                `act_cd, cb_act_cd, open_bal_amt , drcr, n_add_user_id, d_add_date) ` +
                `values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, clock_timestamp())`;
            for (let detail of details) {
                const { account_type, act_cd, act_name, open_bal_amt, dr_cr } = detail;
                await pool.query(query, [finYear, asonDate, exchange, segment, activityCode, normal_deposit,
                    account_type === 'account' ? act_cd : null, account_type === 'cb_account' ? act_cd : null, open_bal_amt
                    , dr_cr, userId
                ]);
            }
        }
        else {
            query = `update cdbm.fin_open_balance set bal_as_on_date = $1, drcr = $2, open_bal_amt = $3, n_upd_user_id = $4
            , d_upd_date = clock_timestamp() where fin_year = $5 and exc_cd = $6
            and segment = $7 and activity_cd = $8 `;
            for (let detail of details) {
                const { account_type, act_cd, act_name, open_bal_amt, dr_cr } = detail;
                query += account_type === 'account' ? `and act_cd = $9` : `and cb_act_cd = $9`;
                await pool.query(query, [asonDate, dr_cr, open_bal_amt, userId, finYear, exchange, segment, activityCode, act_cd]);
            }
        }
        
        await pool.query(`commit;`);
        res.json({message: 'Opening Balance Saved Successfully'});
    }
    catch(error) {
        console.log(error);
        await pool.query(`rollback;`);
        res.status(500).send(error.message);
    }

//   try {
//     await pool.query('BEGIN');

//     if (voucherNo) {
//       for (let detail of details) {
//         const { act_name, dr_amount, cr_amount, dr_cr, exchange, narration,
//           act_cd, branch_cd, analyzer_code } = detail; 
//         let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;

//         const insertQuery_fin = `
//                     INSERT INTO cdbm.fin_tran_temp
//                         (fin_year, trans_date, eff_date, cmp_cd, cb_act_cd, amount, drcr, segment,
//                         nor_depos, narration, act_cd, narr_code, voucher_no,book_type, trans_type)
//                     VALUES
//                         ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, $6, $7, $8, 
//                         $9, $10, $11, $12, $13, $14, $15)
//                   `;
//         await pool.query(insertQuery_fin, [finYear, voucherDate, effectiveDate, activityCode, null, amount, dr_cr, segment,
//           normal_deposit, narration, act_cd, analyzer_code, voucherNo, bookType, transType]);

//       }
//       await pool.query('CALL cdbm.update_fin_temp($1, $2, $3, $4, $5, $6, $7)'
//         , [finYear, bookType, voucherNo, null, segment, activityCode, normal_deposit]);
//     }
//     else {
//       const selectResult = await pool.query(`
//         SELECT fin_year 
//         FROM cdbm.fin_company 
//         WHERE to_date($1,'YYYY-MM-DD') 
//         BETWEEN to_date(to_char(fin_yr_frm,'YYYY-MM-DD'),'YYYY-MM-DD') 
//         AND to_date(to_char(fin_yr_to,'YYYY-MM-DD'),'YYYY-MM-DD');
//     `, [voucherDate]);

//       if (selectResult.rows.length === 0) {
//         throw new Error('Financial year not found for the provided voucher date');
//       }
//       const finYear = selectResult.rows[0].fin_year;

//       let newBranch_cd = '';
//       let newsegement = '';
//       let newactivity = '';
//       let newcmp_cd = '';

//       for (let detail of details) {
//         const { segment, activity, branch_cd, cmp_cd } = detail;
//         newBranch_cd = branch_cd;
//         newsegement = segment;
//         newactivity = activity;
//         newcmp_cd = cmp_cd;
//       }
//       console.log("Parameters for jvnoQuery:", finYear, bookType, newBranch_cd, newcmp_cd, newactivity, newsegement);

//       const jvnoQuery = `
//             SELECT jv_no 
//             FROM cdbm.fin_book_type 
//             WHERE fin_year = $1
//                 AND book_type = $2 
//                 AND activity_code = $3
//                 AND seg_code = $4
//         `;

//       const jvnoResult = await pool.query(jvnoQuery, [finYear, bookType, activityCode, segment]);
//       if (jvnoResult.rows.length === 0) {
//         throw new Error('JV number not found for the provided criteria');
//       }
//       const currentJVNo = jvnoResult.rows[0].jv_no;
//       console.log('currentJVNo ', currentJVNo);
//       for (let detail of details) {
//         const { act_name, dr_amount, cr_amount, dr_cr, exchange, narration,
//           act_cd, branch_cd, analyzer_code } = detail;
//         let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;

//         const insertQuery = `
//             INSERT INTO cdbm.fin_transactions 
//                 (book_type, trans_date, eff_date, act_cd, amount, drcr, segment, exc_cd, nor_depos, 
//                   narration, fin_year, branch_cd, cmp_cd, voucher_no, narr_code, trans_type, n_add_user_id)
//             VALUES 
//                 ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
//                 $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`;
//         //console.log('insertQuery ==> ', insertQuery);
//         console.log('branch_cd ---> ', branch_cd);
//         // console.log('cmp_cd ---> ', cmp_cd);

//         await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, act_cd, amount, dr_cr, segment, exchange, normal_deposit,
//           narration, finYear, branch_cd, activityCode, currentJVNo, analyzer_code, transType, userId]);
//       }

//       const updateJVNoQuery = `
//           UPDATE cdbm.fin_book_type 
//           SET jv_no = jv_no + 1 
//           WHERE fin_year = $1 
//               AND book_type = $2 
//               AND activity_code = $3
//               AND seg_code = $4`;

//       await pool.query(updateJVNoQuery, [finYear, bookType, activityCode, segment]);
//     }
//     await pool.query('COMMIT');
//     res.status(200).send('Voucher(s) inserted successfully');
//   } catch (error) {
//     await pool.query('ROLLBACK');
//     console.error('Error inserting voucher:', error);
//     res.status(500).send('Error inserting voucher(s). Please try again.');
//   }
});

module.exports = opening_balance_router;
