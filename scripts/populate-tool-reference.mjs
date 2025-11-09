#!/usr/bin/env node

/**
 * Populate tool_reference table with HTML tools from reference library
 *
 * Usage:
 *   node scripts/populate-tool-reference.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { JSDOM } from 'jsdom';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

function parseHTMLTool(filePath, htmlContent) {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const titleElement = document.querySelector('title');
  const title = titleElement ? titleElement.textContent.trim() : path.basename(filePath, '.html');

  let description = '';
  const descParagraph = document.querySelector('p');
  if (descParagraph) {
    description = descParagraph.textContent.trim();
  }

  const filename = path.basename(filePath, '.html');
  const toolName = filename.replace(/_\d+$/, '');
  const category = getToolCategory(toolName);
  const features = extractKeyFeatures(document);
  const functionality = extractFunctionality(document);
  const usagePatterns = getUsagePatterns(toolName);

  return {
    toolName,
    title,
    description,
    category,
    features,
    functionality,
    usagePatterns,
    htmlContent,
    filename: path.basename(filePath)
  };
}

function getToolCategory(toolName) {
  const categories = {
    'budget': 'Finance & Planning',
    'calculator': 'Utilities & Math',
    'timer': 'Productivity & Time',
    'kanban': 'Project Management',
    'form': 'Data Collection',
    'chart': 'Data Visualization',
    'tracker': 'Productivity & Tracking',
    'scheduler': 'Time & Calendar',
    'checklist': 'Task Management',
    'comparison': 'Analysis & Decision',
    'decision': 'Analysis & Decision',
    'habit': 'Personal Development',
    'meeting': 'Collaboration',
    'progress': 'Project Management',
    'random': 'Utilities & Fun',
    'rating': 'Feedback & Assessment',
    'slider': 'User Interface',
    'text': 'Content & Writing',
    'timeline': 'Project Management',
    'date': 'Time & Calendar'
  };

  for (const [key, category] of Object.entries(categories)) {
    if (toolName.includes(key)) return category;
  }

  return 'General Tools';
}

function extractKeyFeatures(document) {
  const features = [];

  if (document.querySelector('.calculator, #calculator')) features.push('Calculator interface');
  if (document.querySelector('.timer, #timer')) features.push('Timer functionality');
  if (document.querySelector('.kanban, .task-board')) features.push('Kanban board layout');
  if (document.querySelector('.form, form')) features.push('Form handling');
  if (document.querySelector('.chart, .graph')) features.push('Data visualization');
  if (document.querySelector('.progress, .progress-bar')) features.push('Progress tracking');
  if (document.querySelector('.calendar, .scheduler')) features.push('Calendar/scheduling');
  if (document.querySelector('table')) features.push('Tabular data display');
  if (document.querySelector('.slider, input[type="range"]')) features.push('Slider controls');
  if (document.querySelector('button')) features.push('Interactive buttons');
  if (document.querySelector('input, textarea, select')) features.push('User input fields');

  return features.join(', ') || 'Interactive user interface';
}

function extractFunctionality(document) {
  const functions = [];

  const buttons = document.querySelectorAll('button[onclick]');
  buttons.forEach(button => {
    const onclick = button.getAttribute('onclick');
    const text = button.textContent.trim();
    if (text && onclick) {
      functions.push(`${text}: ${onclick}`);
    }
  });

  const inputs = document.querySelectorAll('input[type], select');
  inputs.forEach(input => {
    const type = input.type || input.tagName.toLowerCase();
    const id = input.id || input.name;
    if (id) {
      functions.push(`${type} input: ${id}`);
    }
  });

  return functions.length > 0 ? functions.join('; ') : 'Interactive tool with dynamic functionality';
}

function getUsagePatterns(toolName) {
  const patterns = {
    'budget': 'Financial planning, expense tracking, income management',
    'calculator': 'Mathematical calculations, quick computations',
    'timer': 'Time management, productivity tracking, countdowns',
    'kanban': 'Project management, task organization, workflow visualization',
    'form': 'Data collection, user input, information gathering',
    'chart': 'Data visualization, analytics, reporting',
    'tracker': 'Progress monitoring, habit building, goal tracking',
    'scheduler': 'Appointment booking, time management, calendar planning',
    'checklist': 'Task completion, to-do management, progress tracking',
    'comparison': 'Decision making, option analysis, feature comparison',
    'decision': 'Choice analysis, weighted scoring, decision support',
    'habit': 'Personal development, routine building, behavior tracking',
    'meeting': 'Team coordination, scheduling, collaboration',
    'progress': 'Project tracking, milestone monitoring, status updates',
    'random': 'Random selection, decision making, entertainment',
    'rating': 'Feedback collection, assessment, evaluation',
    'slider': 'Value adjustment, range selection, interactive controls',
    'text': 'Content creation, text manipulation, formatting',
    'timeline': 'Project planning, milestone tracking, chronological display',
    'date': 'Date selection, time picking, scheduling'
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    if (toolName.includes(key)) return pattern;
  }

  return 'General purpose interactive tool for various workflows';
}

async function main() {
  console.log('\n🛠️  Populating tool_reference table...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const toolsDir = path.join(__dirname, '..', 'tools', 'reference-library');
    const files = await fs.readdir(toolsDir);
    const htmlFiles = files.filter(file => file.endsWith('.html'));

    console.log(`📚 Found ${htmlFiles.length} reference tools\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of htmlFiles) {
      try {
        const filePath = path.join(toolsDir, file);
        const htmlContent = await fs.readFile(filePath, 'utf-8');
        const toolData = parseHTMLTool(filePath, htmlContent);

        await client.query(`
          INSERT INTO tool_reference (
            tool_name, title, description, category, features,
            functionality, usage_patterns, html_content, filename
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (tool_name) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            features = EXCLUDED.features,
            functionality = EXCLUDED.functionality,
            usage_patterns = EXCLUDED.usage_patterns,
            html_content = EXCLUDED.html_content,
            filename = EXCLUDED.filename,
            created_at = CURRENT_TIMESTAMP
        `, [
          toolData.toolName,
          toolData.title,
          toolData.description,
          toolData.category,
          toolData.features,
          toolData.functionality,
          toolData.usagePatterns,
          toolData.htmlContent,
          toolData.filename
        ]);

        console.log(`  ✅ ${toolData.title}`);
        successCount++;

      } catch (err) {
        console.error(`  ❌ ${file}: ${err.message}`);
        errorCount++;
      }
    }

    const result = await client.query('SELECT COUNT(*) as total FROM tool_reference');
    const totalInDb = result.rows[0].total;

    console.log('\n📊 Summary:');
    console.log(`  ✅ Success: ${successCount} tools`);
    console.log(`  ❌ Errors: ${errorCount} tools`);
    console.log(`  📚 Total in database: ${totalInDb} tools`);
    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
