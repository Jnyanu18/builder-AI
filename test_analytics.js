fetch('http://localhost:5000/api/analytics/suggestions')
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
