const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const brok_slab_routes = express.Router();
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

brok_slab_routes.get('/slab-settlementTye', async (req, res) => {
    try {
        const result = await pool.query("SELECT int_mkt_type, description FROM CDBM.cash_exchange_settlement_type");
        res.json(result.rows);
        // console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

brok_slab_routes.post('/cash_bill_slab_master', async (req, res) => {
    const { slab_id, slab_name, alias, date_applicable, to_date } = req.body;

    const query = `
        INSERT INTO cdbm.CASH_BILL_SLAB_MASTER (SLAB_ID, SLAB_NAME, ALIAS, DATE_APP, DATE_TO)
        VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [slab_id, slab_name, alias, date_applicable || null, to_date || null];

    try {
        await pool.query(query, values);
        res.status(201).send({ message: 'Data inserted successfully' });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Error inserting data');
    }
});

brok_slab_routes.post('/save_normal_slab', async (req, res) => {
    const { slabId, normalData } = req.body;
    const { nor_sl_code, settlementType_normal, range_applicable, range, rate_normal,
        sq_up_rate, sq_up_crit, app_to_normal_slab, app_form_normal_slab, brok_crit,
        delivery_range_applicable, delivery_brok_crit, delivery_rate, delivery_range } = normalData;

    // console.log('body-----', req.body);

    // if (nor_sl_code) {
    //   // Update existing record
    //   const query = `UPDATE cdbm.cash_bill_normal_slab 
    //                  SET int_mkt_type = $1, brok_rate = $2, brok_crit = $3, 
    //                      rs = $4, range_id = $5, sq_up_brok = $6, 
    //                      sq_up_crit = $7, date_app = $8, date_to = $9 
    //                  WHERE nor_sl_code = $10`;
    //   const values = [settlementType_normal, rate_normal, brok_crit, range_applicable, range || null, 
    //                   sq_up_rate, sq_up_crit, app_form_normal_slab, app_to_normal_slab, nor_sl_code];

    //   pool.query(query, values, (error, results) => {
    //     if (error) {
    //       console.error('Error updating data:', error);
    //       return res.status(500).send('Error updating data');
    //     }

    //     // Optionally retrieve updated data
    //     pool.query('SELECT * FROM cdbm.cash_bill_normal_slab', (error, results) => {
    //       if (error) {
    //         console.error('Error retrieving data:', error);
    //         return res.status(500).send('Error retrieving data');
    //       }
    //       res.json(results.rows);
    //       console.log('Updated result', results.rows);
    //     });
    //   });
    // } else {

    if (nor_sl_code) {
        let date = new Date(app_form_normal_slab);
        date.setDate(date.getDate() - 1);
        let date_to = date.toISOString().split('T')[0];
        console.log('date_to', date_to);
        const lv_statement = `UPDATE cdbm.cash_bill_normal_slab 
                    SET date_to = '`+ date_to + ` 00:00:00' WHERE nor_sl_code = ${nor_sl_code};`;
        await pool.query(lv_statement);
    }

    // Insert new record
    const getMaxCodeQuery = 'SELECT MAX(nor_sl_code) AS max_code FROM cdbm.cash_bill_normal_slab';

    pool.query(getMaxCodeQuery, (error, result) => {
        if (error) {
            console.error('Error retrieving max nor_sl_code:', error);
            return res.status(500).send('Error retrieving max nor_sl_code');
        }

        const maxCode = result.rows[0].max_code ? parseInt(result.rows[0].max_code, 10) : 0; // Default to 0 if no rows found
        const newNorSlCode = maxCode + 1; // Increment by 1

        const insertQuery = `INSERT INTO cdbm.cash_bill_normal_slab (slab_id, nor_sl_code, int_mkt_type, 
                             brok_rate, brok_crit, rs, range_id, sq_up_brok, sq_up_crit, date_app, date_to,
                             deliv_brok_rate, deliv_brok_crit, deliv_rs, deliv_range_id) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;
        const values = [slabId, newNorSlCode, settlementType_normal, rate_normal, brok_crit, range_applicable,
            range || null, sq_up_rate, sq_up_crit, app_form_normal_slab || null, app_to_normal_slab || null,
            delivery_rate, delivery_brok_crit, delivery_range_applicable, delivery_range || null];

        pool.query(insertQuery, values, (error, results) => {
            if (error) {
                console.error('Error inserting data:', error);
                return res.status(500).send('Error inserting data');
            }

            // Optionally retrieve updated data
            pool.query('SELECT * FROM cdbm.cash_bill_normal_slab', (error, results) => {
                if (error) {
                    console.error('Error retrieving data:', error);
                    return res.status(500).send('Error retrieving data');
                }
                res.json(results.rows);
                // console.log('Inserted result', results.rows);
            });
        });
    });
    // }
});

brok_slab_routes.get('/get_cash_bill_normal_slab/:slab_id', async (req, res) => {
    const { slab_id } = req.params;
    const query = `SELECT nor.slab_id, nor_sl_code, nor.int_mkt_type, nor.brok_rate, nor.brok_crit, 
                     nor.rs, nor.range_id, nor.sq_up_brok, nor.sq_up_crit, nor.date_app,
                     nor.date_to, nor.deliv_brok_rate, nor.deliv_brok_crit, nor.deliv_rs, 
                   nor.deliv_range_id, cexc.description desc
                   FROM cdbm.CASH_BILL_NORMAL_SLAB nor
                   JOIN cdbm.cash_exchange_settlement_type cexc ON nor.int_mkt_type = cexc.int_mkt_type
                   AND cexc.DATE_TO IS NULL
                   WHERE nor.SLAB_ID = $1 ORDER By nor.nor_sl_code desc;`;

    try {
        const result = await pool.query(query, [slab_id]);
        if (result.rows.length === 0) {
            return res.status(404).send('Slab not found');
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching normal slab data:', error);
        res.status(500).send('Error fetching data');
    }
});

brok_slab_routes.get('/search_cash_bill_slab/:slab_id', async (req, res) => {
    const { slab_id } = req.params;
    const query = `select slab_id, slab_name, alias, date_app, date_to from cdbm.cash_bill_slab_master where slab_id= $1;`;

    try {
        const result = await pool.query(query, [slab_id]);
        // if (result.rows.length === 0) {
        //   return res.status(404).send('Slab not found');
        // }
        res.status(200).json(result.rows);
        // console.log('result.rows',result.rows);
    } catch (error) {
        console.error('Error fetching cash bill slab data:', error);
        res.status(500).send('Error fetching data');
    }
});

brok_slab_routes.post('/CASH_BILL_DEL_RANGE_MASTER', async (req, res) => {
    const { Gen_range_name, Del_range_name } = req.body;

    const maxQuery = `
          SELECT MAX(range_id) AS max_range_id
          FROM cdbm.CASH_BILL_DEL_RANGE_MASTER
      `;

    const insertQuery = `
          INSERT INTO cdbm.CASH_BILL_DEL_RANGE_MASTER (range_id, range_name)
          VALUES ($1, $2)
      `;

    const selectQuery = `
          SELECT * FROM cdbm.CASH_BILL_DEL_RANGE_MASTER
      `;

    try {
        // Get the current maximum range_id
        const result = await pool.query(maxQuery);
        const maxRangeId = result.rows[0].max_range_id ? parseInt(result.rows[0].max_range_id, 10) : 0; // Use 0 if no records exist
        const newRangeId = maxRangeId + 1; // Increment by 1

        // Insert the new record

        if (Gen_range_name) {
            await pool.query(insertQuery, [newRangeId, Gen_range_name]);
        } else if (Del_range_name) {
            await pool.query(insertQuery, [newRangeId, Del_range_name]);
        }

        // Retrieve all records from the table
        const allRecordsResult = await pool.query(selectQuery);

        // Send the new range_id and all records back to the client
        res.status(201).send({
            message: 'Data inserted successfully',
            newRangeId,
            data: allRecordsResult.rows // Send all records
        });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Error inserting data');
    }
});

brok_slab_routes.post('/save_genrange_slab', async (req, res) => {
    const { Gen_range_id, newGenRangeArr, genRangeData } = req.body;

    //     // Optionally retrieve updated data
    //  const results = pool.query('SELECT * FROM cdbm.cash_bill_range_details')
    // , (error, results) => {
    //   if (error) {
    //     console.error('Error retrieving data:', error);
    //     return res.status(500).send('Error retrieving data');
    //   }
    // res.json(results.rows);
    //       console.log('Updated result', results.rows);
    // });
    //   });
    // } 
    // else {


    //// In case of edit, set previous status and end date
    try {
        await pool.query('BEGIN');
        const getCount = 'SELECT count(1) AS row_cnt FROM cdbm.cash_bill_range_details where range_id = $1';
        result = await pool.query(getCount, [Gen_range_id]);
        var lv_row_cnt = result.rows[0].row_cnt;

        if (lv_row_cnt > 0) {
            const lv_statement = `update cdbm.cash_bill_range_details set status = 'I', end_date = clock_timestamp()
                          where range_id=$1;`
            await pool.query(lv_statement, [Gen_range_id]);
        }

        // Insert new record
        if (newGenRangeArr.length > 0) {
            const getMaxCodeQuery = 'SELECT coalesce(MAX(range_code), 0) + 1 AS max_code FROM cdbm.cash_bill_range_details';
            result = await pool.query(getMaxCodeQuery);
            var maxCode = result.rows[0].max_code;
            const insertQuery = `INSERT INTO cdbm.cash_bill_range_details (range_code, range_id, rg_from, 
                                    rg_to, brok_rate, brok_crit, sq_up_brok,sq_up_crit, status, start_date) 
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'A', clock_timestamp())`;
            for (let genrange of newGenRangeArr) {
                const { gen_range_form, gen_range_to, gen_charge_normal, gen_flat_normal,
                    gen_sq_up_charges, gen_flat, gen_range_code } = genrange;

                await pool.query(insertQuery, [maxCode, Gen_range_id, gen_range_form, gen_range_to,
                    gen_charge_normal, gen_flat_normal, gen_sq_up_charges,
                    gen_flat]);

                maxCode++;
            }
        }
        await pool.query('COMMIT');
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting normal gen ranges:', error);

    }
    // else if(genRangeData.length > 0) {
    //   for (let genRange of genRangeData) {
    //     const getMaxCodeQuery = 'SELECT MAX(range_code) AS max_code FROM cdbm.cash_bill_range_details';

    //     pool.query(getMaxCodeQuery, (error, result) => {
    //       if (error) {
    //         console.error('Error retrieving max range_code:', error);
    //         return res.status(500).send('Error retrieving max range_code');
    //       }

    //       const maxCode = result.rows[0].max_code ? parseInt(result.rows[0].max_code, 10) : 0; 
    //       const newgen_range_code = maxCode + 1; 

    //       const { gen_range_form, gen_range_to, gen_charge_normal, gen_flat_Normal, gen_sq_up_charges, gen_flat, gen_range_code } = genRange

    //       const insertQuery = `INSERT INTO cdbm.cash_bill_range_details (range_code, range_id, rg_from, 
    //                              rg_to, brok_rate, brok_crit, sq_up_brok,sq_up_crit) 
    //                              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    //       const values = [newgen_range_code, Gen_range_id, gen_range_form, gen_range_to,
    //         gen_charge_normal || null, gen_flat_Normal || null, gen_sq_up_charges || null,
    //         gen_flat || null];

    //       pool.query(insertQuery, values)

    //       });
    //    });
    //     }

    //    }
    // }
});

brok_slab_routes.get('/cash_bill_Genrange_slab', async (req, res) => {

    // const { Gen_range_id } = req.params;
    // console.log('Gen_range_id',Gen_range_id);
    const query = `select cbrd.range_code, cbrd.range_id rg_id, cbrd.rg_from, cbrd.rg_to, cbrd.brok_rate, 
                     cbrd.brok_crit, cbrd.sq_up_brok, cbrd.sq_up_crit, cbrd.status status,
                     to_char(cbrd.start_date,'yyyy-MM-dd') start_date, cbrd.end_date end_date, cbdrm.range_name rg_name 
                     from cdbm.cash_bill_range_details cbrd join cdbm.CASH_BILL_DEL_RANGE_MASTER cbdrm 
                     on cbrd.range_id = cbdrm.range_id order by cbrd.range_id;`;

    try {
        const result = await pool.query(query);
        // if (result.rows.length === 0) {
        //   return res.status(404).send('Slab not found');
        // }
        res.status(200).json(result.rows);
        // console.log('rangeTable---',result.rows);
    } catch (error) {
        console.error('Error fetching delivery slab data:', error);
        res.status(500).send('Error fetching data');
    }
});

brok_slab_routes.get('/get_gen_ranges_on_select', async (req, res) => {

    const { Gen_range_id } = req.query;
    console.log('Gen_range_id ->', Gen_range_id);
    const query = `select rg_from gen_range_form, rg_to gen_range_to, brok_rate gen_charge_normal, 
                     brok_crit gen_flat_Normal, sq_up_brok gen_sq_up_charges, sq_up_crit gen_flat
                     from cdbm.cash_bill_range_details where range_id = $1 and status = 'A' order by range_code;`;

    try {
        const result = await pool.query(query, [Gen_range_id]);
        res.status(200).json(result.rows);
        console.log('result.rows->', result.rows);
    } catch (error) {
        console.error('Error in get_gen_ranges_on_select :', error);
        res.status(500).send('Error get_gen_ranges_on_select ');
    }
});

brok_slab_routes.get('/get_del_ranges_on_select', async (req, res) => {

    const { Del_range_id } = req.query;
    console.log('Del_range_id ->', Del_range_id);
    const query = `select rg_from del_range_form, rg_to del_range_to,
                   brok_rate del_charge_normal, brok_crit del_flat_normal
                   from cdbm.cash_bill_del_range_details where range_id = $1 and status = 'A' order by range_code;`;

    try {
        const result = await pool.query(query, [Del_range_id]);
        res.status(200).json(result.rows);
        console.log('result.rows->', result.rows);
    } catch (error) {
        console.error('Error in get_del_ranges_on_select :', error);
        res.status(500).send('Error get_del_ranges_on_select ');
    }
});

brok_slab_routes.get('/cash_bill_Delrange_slab', async (req, res) => {

    const query = `select cbdrd.range_code, cbdrd.range_id rg_id, cbdrd.rg_from, cbdrd.rg_to, cbdrd.brok_rate, 
                   cbdrd.brok_crit, cbdrd.status status,
                   to_char(cbdrd.start_date,'yyyy-MM-dd') start_date, cbdrd.end_date end_date, cbdrm.range_name rg_name 
                   from cdbm.cash_bill_del_range_details cbdrd join cdbm.CASH_BILL_DEL_RANGE_MASTER cbdrm 
                   on cbdrd.range_id = cbdrm.range_id order by cbdrd.range_code;`;

    try {
        const result = await pool.query(query);
        //   if (result.rows.length === 0) {
        //     return res.status(404).send('Slab not found');
        // }
        res.status(200).json(result.rows);
        // console.log('rangeTable---',result.rows);
    } catch (error) {
        console.error('Error fetching delivery slab data:', error);
        res.status(500).send('Error fetching data');
    }
});

brok_slab_routes.post('/save_Delrange_slab', async (req, res) => {
    const { Del_range_id, newDelRangeArr, DelRangeData } = req.body;

    try {
        await pool.query('BEGIN');
        //// In case of edit, set previous status and end date
        const getCount = 'SELECT count(1) AS row_cnt FROM cdbm.cash_bill_del_range_details where range_id = $1';
        result = await pool.query(getCount, [Del_range_id]);
        var lv_row_cnt = result.rows[0].row_cnt;

        if (lv_row_cnt > 0) {
            const lv_statement = `update cdbm.cash_bill_del_range_details set status = 'I', end_date = clock_timestamp()
                          where range_id=$1;`
            await pool.query(lv_statement, [Del_range_id]);
        }

        // Insert new record
        if (newDelRangeArr.length > 0) {
            const getMaxCodeQuery = 'SELECT coalesce(MAX(range_code), 0) + 1 AS max_code FROM cdbm.cash_bill_del_range_details';
            result = await pool.query(getMaxCodeQuery);
            var maxCode = result.rows[0].max_code;
            const insertQuery = `INSERT INTO cdbm.cash_bill_del_range_details (range_code, range_id, rg_from, 
                                     rg_to, brok_rate, brok_crit, status, start_date) 
                             VALUES ($1, $2, $3, $4, $5, $6, 'A', clock_timestamp())`;
            for (let delrange of newDelRangeArr) {
                const { del_range_form, del_range_to, del_charge_normal, del_flat_normal, del_range_code } = delrange;

                await pool.query(insertQuery, [maxCode, Del_range_id, del_range_form, del_range_to,
                    del_charge_normal, del_flat_normal]);

                maxCode++;
            }
        }
        await pool.query('COMMIT');
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error inserting del ranges:', error);
    }
}
);

brok_slab_routes.post('/save_scrip_slab', async (req, res) => {
    const { slabId, scripData } = req.body;
    let { ss_sl_code, scrip_app_form, scrip_app_to, scrip_brok_crit, scrip_rate, scrip_Sq_Up_rate, scrip_range_applicable, scrip_range, scrip_sq_up_crit, scrip_cd, scrip_value } = scripData;

    console.log('ss_sl_code', ss_sl_code);
    console.log('body-----', req.body);

    //   if (ss_sl_code) {
    // Update existing record
    // const query = `UPDATE cdbm.CASH_BILL_SCRIP_SLAB 
    //                SET SCRIP_CD = $1, brok_rate = $2, brok_crit = $3, 
    //                    rs = $4, range_id = $5, sq_up_brok = $6, 
    //                    sq_up_crit = $7, date_app = $8, date_to = $9, SERIES = $10
    //                WHERE SS_SL_CODE = $11`;
    //   const values = [scrip_value, scrip_rate, scrip_brok_crit, scrip_range_applicable, scrip_range, scrip_Sq_Up_rate, scrip_sq_up_crit, scrip_app_form, scrip_app_to, scrip_cd, ss_sl_code];

    //   pool.query(query, values, (error, results) => {
    //     if (error) {
    //       console.error('Error updating data:', error);
    //       return res.status(500).send('Error updating data');
    //     }

    //     pool.query('SELECT * FROM cdbm.CASH_BILL_SCRIP_SLAB', (error, results) => {
    //       if (error) {
    //         console.error('Error retrieving data:', error);
    //         return res.status(500).send('Error retrieving data');
    //       }
    //       res.json(results.rows);
    //       console.log('Updated result', results.rows);
    //     });
    //   });
    // } else {

    if (ss_sl_code) {
        let date = new Date(scrip_app_form);
        date.setDate(date.getDate() - 1);
        let date_to = date.toISOString().split('T')[0];
        console.log('date_to', date_to);
        const statement = `UPDATE cdbm.cash_bill_scrip_slab 
                    SET date_to = '`+ date_to + ` 00:00:00' WHERE ss_sl_code = ${ss_sl_code};`;
        await pool.query(statement);
    }
    // Insert new record
    const getMaxCodeQuery = 'SELECT MAX(SS_SL_CODE) AS max_code FROM cdbm.CASH_BILL_SCRIP_SLAB';

    pool.query(getMaxCodeQuery, async (error, result) => {
        if (error) {
            console.error('Error retrieving max ss_sl_code:', error);
            return res.status(500).send('Error retrieving max ss_sl_code');
        }

        const maxCode = result.rows[0].max_code ? parseInt(result.rows[0].max_code, 10) : 0; // Default to 0 if no rows found
        console.log('maxcode', maxCode);
        const newSsSlCode = maxCode + 1; // Increment by 1
        console.log('newSsSlCode', newSsSlCode);

        const insertQuery = `INSERT INTO cdbm.CASH_BILL_SCRIP_SLAB (SLAB_ID, SS_SL_CODE, SCRIP_CD, SERIES, 
                           BROK_RATE, BROK_CRIT, RS, range_id, sq_up_brok, sq_up_crit, date_app, date_to) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
        const values = [slabId, newSsSlCode, scrip_value, scrip_cd, scrip_rate, scrip_brok_crit,
            scrip_range_applicable, scrip_range || null, scrip_Sq_Up_rate, scrip_sq_up_crit, scrip_app_form, scrip_app_to || null];

        pool.query(insertQuery, values)
        // , (error, results) => {
        //   if (error) {
        //     console.error('Error inserting data:', error);
        //     return res.status(500).send('Error inserting data');
        //   }

        const results = await pool.query(`SELECT scrip_cd, series, brok_rate, brok_crit, 
                                   sq_up_brok, sq_up_crit, rs, range_id, date_app, date_to
                                   FROM cdbm.CASH_BILL_SCRIP_SLAB where slab_id=${slabId} order by ss_sl_code`)
        // , (error, results) => {
        //   if (error) {
        //     console.error('Error retrieving data:', error);
        //     return res.status(500).send('Error retrieving data');
        //   }
        res.json(results.rows);
        console.log('Inserted result', results.rows);
        // });
    });
    // });
    // });
    // }
});

brok_slab_routes.get('/cash_bill_scrip_slab/:slab_id', async (req, res) => {
    const { slab_id } = req.params;
    const query = `SELECT ss_sl_code, scrip_cd, series, brok_rate, 
                   brok_crit, sq_up_brok, sq_up_crit, rs, range_id, date_app, date_to FROM cdbm.CASH_BILL_SCRIP_SLAB WHERE slab_id = $1;`;

    try {
        const result = await pool.query(query, [slab_id]);
        if (result.rows.length === 0) {
            return res.status(404).send('Slab not found');
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching scrip slab data:', error);
        res.status(500).send('Error fetching data');
    }
});

brok_slab_routes.get('/searchScrip', async (req, res) => {
    const { name } = req.query;
    try {
        const result = await pool.query('SELECT sec_name, scrip_cd,series FROM  cdbm.cash_scrip_master WHERE sec_name ILIKE $1', [`%${name}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        logError(err, req);
        res.status(500).send('Server error');
    }
});

brok_slab_routes.get('/rangeNamesNormal', async (req, res) => {
    try {
        const result = await pool.query(`select range_id, range_name from cdbm.CASH_BILL_DEL_RANGE_MASTER r
                                       where exists (select range_id from cdbm.cash_bill_range_details d
                                       where d.range_id = r.range_id) order by range_name;`);
        res.json(result.rows);
        console.log('range names rows', result.rows)
    } catch (err) {
        console.error(err.message);
        // logError(err, req);
        // res.status(500).send('Server error');
    }
});

brok_slab_routes.get('/rangeNamesDel', async (req, res) => {
    try {
        const result = await pool.query(`select range_id, range_name from cdbm.CASH_BILL_DEL_RANGE_MASTER r
                                       where exists (select range_id from cdbm.cash_bill_del_range_details d
                                       where d.range_id = r.range_id) order by range_name;`);
        res.json(result.rows);
        console.log('range names rows', result.rows)
    } catch (err) {
        console.error(err.message);
        // logError(err, req);
        // res.status(500).send('Server error');
    }
});

module.exports = brok_slab_routes;
