fetch('http://localhost:5000/api/intent-graph/align', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planText: 'Implement Stripe payments behind feature flag'
  })
}).then(res => res.json()).then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(err => {
  console.error(err);
});
