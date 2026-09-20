/**
 * Google Apps Script - Webhook Handler for Supabase / Stripe
 */

const PACK_ICONS = {
  'heritage_collection': 'https://mirumiter.com/wp-content/uploads/2026/08/Heritage.1.png',
  'heritage': 'https://mirumiter.com/wp-content/uploads/2026/08/Heritage.1.png',
  'mystic_collection': 'https://mirumiter.com/wp-content/uploads/2026/08/Mystic.1.png',
  'mystic': 'https://mirumiter.com/wp-content/uploads/2026/08/Mystic.1.png',
  'seaside_collection': 'https://mirumiter.com/wp-content/uploads/2026/08/Seaside.1.png',
  'seaside': 'https://mirumiter.com/wp-content/uploads/2026/08/Seaside.1.png',
  'discovery_collection': 'https://mirumiter.com/wp-content/uploads/2026/08/Heritage.1.png',
  'discovery': 'https://mirumiter.com/wp-content/uploads/2026/08/Heritage.1.png',
  'all_access': 'https://mirumiter.com/wp-content/uploads/2026/08/Heritage.1.png'
};

const ROUTE_ICONS = {
  'santa-cruz': 'https://tenerifewonders.github.io/mirumiter/icons/12-4.png',
  'teide': 'https://tenerifewonders.github.io/mirumiter/icons/13-4.png',
  'costa-adeje': 'https://tenerifewonders.github.io/mirumiter/icons/14-4.png',
  'anaga': 'https://tenerifewonders.github.io/mirumiter/icons/15-4.png',
  'la-laguna': 'https://tenerifewonders.github.io/mirumiter/icons/16-4.png',
  'puerto-cruz': 'https://tenerifewonders.github.io/mirumiter/icons/17-4.png',
  'quinta': 'https://tenerifewonders.github.io/mirumiter/icons/19-4.png',
  'candelaria': 'https://tenerifewonders.github.io/mirumiter/icons/22-4.png',
  'la-orotava': 'https://tenerifewonders.github.io/mirumiter/icons/23-4.png'
};

const ROUTE_NAMES = {
  'santa-cruz': { en: 'Santa Cruz de Tenerife', de: 'Santa Cruz de Tenerife', fr: 'Santa Cruz de Tenerife' },
  'teide': { en: 'Teide National Park', de: 'Teide Nationalpark', fr: 'Parc National del Teide' },
  'costa-adeje': { en: 'Costa Adeje', de: 'Costa Adeje', fr: 'Costa Adeje' },
  'anaga': { en: 'Anaga Rural Park', de: 'Anaga Landschaftspark', fr: 'Parc Rural d\'Anaga' },
  'la-laguna': { en: 'San Cristóbal de La Laguna', de: 'San Cristóbal de La Laguna', fr: 'San Cristóbal de La Laguna' },
  'puerto-cruz': { en: 'Puerto de la Cruz', de: 'Puerto de la Cruz', fr: 'Puerto de la Cruz' },
  'quinta': { en: 'La Quinta', de: 'La Quinta', fr: 'La Quinta' },
  'candelaria': { en: 'Candelaria', de: 'Candelaria', fr: 'Candelaria' },
  'la-orotava': { en: 'La Orotava', de: 'La Orotava', fr: 'La Orotava' }
};

const BUNDLE_ROUTES = {
  'heritage_collection': ['santa-cruz', 'anaga', 'la-orotava'],
  'heritage': ['santa-cruz', 'anaga', 'la-orotava'],
  'mystic_collection': ['teide', 'la-laguna', 'quinta'],
  'mystic': ['teide', 'la-laguna', 'quinta'],
  'seaside_collection': ['costa-adeje', 'puerto-cruz', 'candelaria'],
  'seaside': ['costa-adeje', 'puerto-cruz', 'candelaria'],
  'discovery_collection': ['santa-cruz', 'teide', 'costa-adeje', 'anaga', 'la-laguna', 'la-orotava', 'puerto-cruz', 'candelaria', 'quinta'],
  'discovery': ['santa-cruz', 'teide', 'costa-adeje', 'anaga', 'la-laguna', 'la-orotava', 'puerto-cruz', 'candelaria', 'quinta'],
  'all_access': ['santa-cruz', 'teide', 'costa-adeje', 'anaga', 'la-laguna', 'la-orotava', 'puerto-cruz', 'candelaria', 'quinta']
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const email = data.email || data.user_email || data.customer_email || '';
    
    // Support all property names sent by Edge Function: guide, fullGuideCode, guideCode, product, collection
    const rawGuide = (data.guide || data.fullGuideCode || data.guideCode || data.product || data.collection || '').toLowerCase().trim();

    // Support all property names & formats for licenses: licenses (array or string), license, license_codes, codes
    let licenses = [];
    if (Array.isArray(data.licenses) && data.licenses.length > 0) licenses = data.licenses;
    else if (Array.isArray(data.license_codes) && data.license_codes.length > 0) licenses = data.license_codes;
    else if (Array.isArray(data.codes) && data.codes.length > 0) licenses = data.codes;
    else if (typeof data.licenses === 'string' && data.licenses) licenses = data.licenses.split(',').map(s=>s.trim()).filter(Boolean);
    else if (typeof data.license === 'string' && data.license) licenses = data.license.split(',').map(s=>s.trim()).filter(Boolean);
    else if (typeof data.code === 'string' && data.code) licenses = data.code.split(',').map(s=>s.trim()).filter(Boolean);

    // Detect language
    let lang = 'en';
    if (rawGuide.endsWith('_de')) lang = 'de';
    else if (rawGuide.endsWith('_fr')) lang = 'fr';
    else if (rawGuide.endsWith('_en')) lang = 'en';

    const guideKey = rawGuide.replace(/_(de|fr|en)$/, '');

    // Record in Google Sheets (if bound to a spreadsheet)
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        const sheet = ss.getActiveSheet();
        sheet.appendRow([new Date(), email, rawGuide, licenses.join(','), lang]);
      }
    } catch (sheetErr) {
      Logger.log('Sheet logging skipped: ' + sheetErr);
    }

    // Build & Send Customer Email
    sendCustomerEmail(email, guideKey, licenses, lang);

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendCustomerEmail(email, guideKey, licenses, lang) {
  const isBundle = !!BUNDLE_ROUTES[guideKey];
  const licenseParam = licenses.join(',');
  const appUrl = `https://tenerifewonders.github.io/mirumiter/?lang=${lang}&license=${licenseParam}`;

  let headerIconUrl = PACK_ICONS[guideKey] || ROUTE_ICONS[guideKey] || '';

  let titleText = '';
  if (guideKey.includes('heritage')) titleText = 'Heritage Collection';
  else if (guideKey.includes('mystic')) titleText = 'Mystic Collection';
  else if (guideKey.includes('seaside')) titleText = 'Seaside Collection';
  else if (guideKey.includes('discovery') || guideKey.includes('all_access')) titleText = 'Discovery Collection';
  else titleText = (ROUTE_NAMES[guideKey] && ROUTE_NAMES[guideKey][lang]) || guideKey;

  let itemsHtml = '';
  if (isBundle) {
    const routesList = BUNDLE_ROUTES[guideKey];
    routesList.forEach((rKey, index) => {
      const rName = (ROUTE_NAMES[rKey] && ROUTE_NAMES[rKey][lang]) || rKey;
      const rIcon = ROUTE_ICONS[rKey] || '';
      const lic = licenses[index] || licenses[0] || '';
      itemsHtml += `
        <li style="margin-bottom: 12px; font-size: 14px; list-style: none; display: flex; align-items: center; gap: 8px;">
          ${rIcon ? `<img src="${rIcon}" width="20" height="20" style="vertical-align: middle; flex-shrink: 0;" alt="">` : ''}
          <span><strong>${rName}</strong> ${lic ? `<span style="color: #64748b; font-size: 12px;">(License: ${lic})</span>` : ''}</span>
        </li>`;
    });
  } else {
    const rName = (ROUTE_NAMES[guideKey] && ROUTE_NAMES[guideKey][lang]) || guideKey;
    const rIcon = ROUTE_ICONS[guideKey] || '';
    const lic = licenses[0] || '';
    itemsHtml += `
      <li style="margin-bottom: 12px; font-size: 14px; list-style: none; display: flex; align-items: center; gap: 8px;">
        ${rIcon ? `<img src="${rIcon}" width="20" height="20" style="vertical-align: middle; flex-shrink: 0;" alt="">` : ''}
        <span><strong>${rName}</strong> ${lic ? `<span style="color: #64748b; font-size: 12px;">(License: ${lic})</span>` : ''}</span>
      </li>`;
  }

  const subject = `Your Tenerife Wonders Audioguide Access`;

  const headerImageHtml = headerIconUrl ? `<img src="${headerIconUrl}" height="42" style="vertical-align: middle; margin-right: 8px;" alt="">` : '';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; color: #1e293b;">
      <h2 style="text-align: center; color: #0f172a; margin-top: 0;">Thank you for your purchase!</h2>
      
      <div style="text-align: center; margin: 20px 0;">
        ${headerImageHtml}
        <h3 style="display: inline-block; vertical-align: middle; margin: 0; color: #0284c7; font-size: 20px;">${titleText}</h3>
      </div>

      <p style="font-size: 14px; color: #475569;">The following audioguides are included in your collection:</p>
      
      <ul style="padding-left: 0; margin: 16px 0; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
        ${itemsHtml}
      </ul>

      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${appUrl}" target="_blank" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 700; border-radius: 8px; font-size: 15px; display: inline-block;">Open App & Unlock ${isBundle ? 'Collection' : 'Audioguide'}</a>
      </div>

      <p style="font-size: 12px; color: #64748b; word-break: break-all; margin-top: 20px;">
        Link: <a href="${appUrl}" style="color: #0284c7;">${appUrl}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">Tenerife Wonders &copy; 2026 - Unique Audioguide Experiences</p>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}
