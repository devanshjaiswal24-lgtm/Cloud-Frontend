export const getLoanPeriodDays = () => {
  const loanPeriod = Number.parseInt(process.env.LOAN_PERIOD_DAYS, 10);
  return Number.isFinite(loanPeriod) && loanPeriod > 0 ? loanPeriod : 14;
};

export const getFinePerDay = () => {
  const finePerDay = Number.parseFloat(process.env.FINE_PER_DAY);
  return Number.isFinite(finePerDay) && finePerDay >= 0 ? finePerDay : 0.5;
};

export const calculateFine = (dueDate, returnDate) => {
  const due = new Date(dueDate);
  const returned = new Date(returnDate);
  const diffMs = returned.getTime() - due.getTime();

  if (Number.isNaN(due.getTime()) || Number.isNaN(returned.getTime()) || diffMs <= 0) {
    return {
      daysLate: 0,
      fineAmount: 0,
    };
  }

  const daysLate = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const fineAmount = Number((daysLate * getFinePerDay()).toFixed(2));

  return {
    daysLate,
    fineAmount,
  };
};

export const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};