const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/VendorPage.jsx');
let code = fs.readFileSync(filePath, 'utf8');

function extractFunction(source, funcName) {
  const searchStr = `function ${funcName}`;
  const startIdx = source.indexOf(searchStr);
  if (startIdx === -1) return null;

  const firstParen = source.indexOf('(', startIdx);
  let parenCount = 0;
  let parenStarted = false;
  let parenEndIdx = -1;

  for (let i = firstParen; i < source.length; i++) {
    if (source[i] === '(') {
      parenCount++;
      parenStarted = true;
    } else if (source[i] === ')') {
      parenCount--;
    }
    if (parenStarted && parenCount === 0) {
      parenEndIdx = i;
      break;
    }
  }

  const bodyStart = source.indexOf('{', parenEndIdx);
  if (bodyStart === -1) return null;

  let braceCount = 0;
  let hasStarted = false;
  let endIdx = -1;

  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') {
      braceCount++;
      hasStarted = true;
    } else if (source[i] === '}') {
      braceCount--;
    }
    
    if (hasStarted && braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }

  if (endIdx === -1) return null;
  return {
    content: source.substring(startIdx, endIdx),
    startIdx,
    endIdx
  };
}

const componentsToExtract = [
  { name: 'ShopDetailSheet', dir: 'modals' },
  { name: 'ProductItem', dir: 'modals' },
  { name: 'CreateShopSheet', dir: 'modals' },
  { name: 'AddProductSheet', dir: 'modals' },
  { name: 'PremiumSheet', dir: 'modals' },
  { name: 'CoinsSheet', dir: 'modals' },
  { name: 'VerificationSheet', dir: 'modals' },
  { name: 'ReceivedOrdersTab', dir: 'tabs' },
  { name: 'QuotesTab', dir: 'tabs' }
];

const importsToAdd = `import React, { useState, useEffect, useRef } from 'react'
import {
  Store, Plus, Package, Star, Trash2, Eye, Edit3,
  MapPin, Truck, Phone, ChevronDown, X, Check,
  TrendingUp, Users, Heart, Coins, Crown, Zap,
  BarChart3, Clock, Camera, Search, ChevronRight,
  ShieldCheck, Upload, AlertCircle, Info, Lock
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'
import { Avatar, Button, BottomSheet, Modal, PremiumBadge, Skeleton } from '@/components/ui'
import FarmerCycleManager from '@/components/marketplace/FarmerCycleManager'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const formatFCFA = (val) => Math.round(val || 0).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' ') + ' FCFA';
const PRODUCT_LIMITS = { 0: 10, 1: 20, 2: 30, 3: Infinity }

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}
`;

let extractedCode = '';
let modifiedVendorPage = code;

componentsToExtract.forEach(comp => {
  const extracted = extractFunction(modifiedVendorPage, comp.name);
  if (extracted) {
    const fileContent = `${importsToAdd}\n\nexport default ${extracted.content}\n`;
    const targetDir = path.join(__dirname, \`../src/components/vendor/\${comp.dir}\`);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, \`\${comp.name}.jsx\`), fileContent);
    console.log(\`Extracted \${comp.name}\`);
    
    // Replace the function in VendorPage with nothing
    modifiedVendorPage = modifiedVendorPage.substring(0, extracted.startIdx) + modifiedVendorPage.substring(extracted.endIdx);
  } else {
    console.log(\`Could not find \${comp.name}\`);
  }
});

// Write updated VendorPage
fs.writeFileSync(filePath, modifiedVendorPage);
console.log('VendorPage.jsx updated');
