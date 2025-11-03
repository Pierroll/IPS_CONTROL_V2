const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const toUtcMidnight = (d) => dayjs(d).startOf('day').utc().toDate();
const startOfNextMonth = (d = new Date()) => dayjs(d).add(1, 'month').startOf('month').toDate();
const daysToEndOfMonth = (d = new Date()) => dayjs(d).endOf('month').diff(dayjs(d).startOf('day'), 'day');

module.exports = { toUtcMidnight, startOfNextMonth, daysToEndOfMonth };
