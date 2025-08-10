const express = require('express');
const cors = require('cors');
const operationsRouter = require('./routes/operations');
const monthlyRecordsRouter = require('./routes/monthlyRecords');
const invoicesRouter = require('./routes/invoices');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/operations', operationsRouter);
app.use('/api/monthly-records', monthlyRecordsRouter);
app.use('/api/invoices', invoicesRouter);

module.exports = app; 