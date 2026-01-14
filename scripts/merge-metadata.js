#!/usr/bin/env node
/**
 * メタデータと記事本文を統合してZenn形式の記事を生成するスクリプト
 *
 * 使い方:
 *   node scripts/merge-metadata.js jj-rebase-vs-merge
 *   node scripts/merge-metadata.js --all
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// ディレクトリパス
const METADATA_DIR = path.join(__dirname, '../metadata');
const ARTICLES_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(__dirname, '../zenn-articles');

/**
 * メタデータから必要な情報を抽出
 */
function extractZennMetadata(metadata) {
  return {
    title: metadata.title,
    emoji: metadata.emoji,
    type: metadata.type,
    topics: metadata.topics,
    published: metadata.published,
  };
}

/**
 * YAMLフロントマターを生成
 */
function generateFrontmatter(metadata) {
  const zennMeta = extractZennMetadata(metadata);
  return `---
${yaml.stringify(zennMeta)}---

`;
}

/**
 * 記事を統合
 */
function mergeArticle(slug) {
  try {
    // メタデータを読み込む
    const metadataPath = path.join(METADATA_DIR, `${slug}.yaml`);
    if (!fs.existsSync(metadataPath)) {
      console.error(`❌ メタデータファイルが見つかりません: ${metadataPath}`);
      return false;
    }

    const metadataContent = fs.readFileSync(metadataPath, 'utf8');
    const metadata = yaml.parse(metadataContent);

    // 記事本文を読み込む
    const articlePath = path.join(ARTICLES_DIR, `${slug}.md`);
    if (!fs.existsSync(articlePath)) {
      console.error(`❌ 記事ファイルが見つかりません: ${articlePath}`);
      return false;
    }

    const content = fs.readFileSync(articlePath, 'utf8');

    // Zenn用の記事を生成
    const frontmatter = generateFrontmatter(metadata);
    const zennArticle = frontmatter + content;

    // 出力ディレクトリを作成
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Zenn用の記事を出力
    const outputPath = path.join(OUTPUT_DIR, `${slug}.md`);
    fs.writeFileSync(outputPath, zennArticle);

    console.log(`✅ 生成完了: ${outputPath}`);
    console.log(`   📝 Title: ${metadata.title}`);
    console.log(`   📊 Topics: ${metadata.topics.join(', ')}`);

    return true;
  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    return false;
  }
}

/**
 * すべての記事を統合
 */
function mergeAllArticles() {
  const files = fs.readdirSync(METADATA_DIR);
  const yamlFiles = files.filter(f => f.endsWith('.yaml'));

  console.log(`📚 ${yamlFiles.length}個の記事を処理します...\n`);

  let successCount = 0;
  yamlFiles.forEach(file => {
    const slug = path.basename(file, '.yaml');
    console.log(`\n処理中: ${slug}`);
    if (mergeArticle(slug)) {
      successCount++;
    }
  });

  console.log(`\n\n✨ 完了: ${successCount}/${yamlFiles.length}個の記事を生成しました`);
}

// メイン処理
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('使い方:');
  console.log('  node scripts/merge-metadata.js <slug>');
  console.log('  node scripts/merge-metadata.js --all');
  console.log('');
  console.log('例:');
  console.log('  node scripts/merge-metadata.js jj-rebase-vs-merge');
  console.log('  node scripts/merge-metadata.js --all');
  process.exit(1);
}

if (args[0] === '--all') {
  mergeAllArticles();
} else {
  const slug = args[0];
  mergeArticle(slug);
}
