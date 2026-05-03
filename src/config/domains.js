const DOMAINS = {
  summasummarum: {
    type: 'summasummarum',
    hosts: ['summasummarum.me', 'www.summasummarum.me'],
    queryValue: 'summasummarum',
    isMultiTenant: true,
    publicDir: 'summasummarum',
    brandName: 'Summa Summarum',
    logoPath: '/shared/images/summasummarum_logo.svg',
    dashboardPath: '/shared/dashboard.html',
    loginPath: '/prijava.html',
    registrationPath: '/registracija.html',
  },
  mojradnik: {
    type: 'mojradnik',
    hosts: ['mojradnik.me', 'www.mojradnik.me'],
    queryValue: 'mojradnik',
    isMultiTenant: false,
    publicDir: 'mojradnik',
    brandName: 'Moj Radnik',
    logoPath: '/mojradnik/logo.png',
    dashboardPath: '/mojradnik/dashboard.html',
    loginPath: '/prijava.html',
    registrationPath: '/registracija.html',
  },
  prijaviradnika: {
    type: 'prijaviradnika',
    hosts: ['prijaviradnika.com', 'www.prijaviradnika.com'],
    queryValue: 'prijaviradnika',
    isMultiTenant: false,
    publicDir: 'prijaviradnika',
    brandName: 'Prijavi Radnika',
    logoPath: '/prijaviradnika/logo.png',
    dashboardPath: '/mojradnik/dashboard.html',
    loginPath: '/prijava.html',
    registrationPath: '/registracija.html',
  },
};

const DEFAULT_DOMAIN = DOMAINS.summasummarum;

function getDomainByType(type) {
  return DOMAINS[type] || DEFAULT_DOMAIN;
}

function detectDomain({ host = '', referer = '', queryDomain = '' } = {}) {
  const normalizedHost = String(host).split(':')[0].toLowerCase();
  const normalizedReferer = String(referer).toLowerCase();
  const normalizedQueryDomain = String(queryDomain).toLowerCase();

  return (
    Object.values(DOMAINS).find(domain => {
      const queryMatches = normalizedQueryDomain === domain.queryValue;
      const refererMatches = normalizedReferer.includes(`domain=${domain.queryValue}`);
      const hostMatches = domain.hosts.some(domainHost =>
        normalizedHost === domainHost || normalizedHost.endsWith(`.${domainHost}`)
      );

      return hostMatches || (normalizedHost.includes('localhost') && (queryMatches || refererMatches));
    }) || DEFAULT_DOMAIN
  );
}

module.exports = {
  DOMAINS,
  DEFAULT_DOMAIN,
  getDomainByType,
  detectDomain,
};
