const { detectDomain } = require('../config/domains');

function domainMiddleware(req, res, next) {
  const domain = detectDomain({
    host: req.get('host'),
    referer: req.get('referer') || '',
    queryDomain: req.query.domain,
  });

  req.domainConfig = domain;
  req.domainType = domain.type;
  req.isMultiTenant = domain.isMultiTenant;

  if (process.env.NODE_ENV !== 'test') {
    console.log(`📍 Domain detected: ${req.domainType} (Host: ${req.get('host')})`);
  }

  next();
}

module.exports = { domainMiddleware };
