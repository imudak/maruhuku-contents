export interface Section {
  title: string;
  content: string[];
  duration: number; // フレーム数
}

export const articleData: Section[] = [
  {
    title: "jjを使っていて驚いた\n「1つの変更を育てていく」という哲学",
    content: [
      "Git/GitHubとは根本的に異なる思想",
      "Gerritのコードレビューシステムから生まれた設計"
    ],
    duration: 180 // 6秒 (30fps)
  },
  {
    title: "はじめに",
    content: [
      "jjの便利さに魅了されて使い始めた",
      "使っているうちに根本的な思想の違いに気づいた",
      "「1つの修正に対して1つの変更単位を使い、説明を上書きしていく」",
      "複数のコミットを積み重ねるのではなく、",
      "1つの変更を完成するまで何度も更新し続ける"
    ],
    duration: 240
  },
  {
    title: "Gerritのコードレビュー",
    content: [
      "GoogleやAndroidプロジェクトで使用",
      "GitHub PRとは異なるアプローチ",
      "1つの論理的な変更 = 1つのchange",
      "changeは1つのまま、内容を育てていく"
    ],
    duration: 210
  },
  {
    title: "Git/GitHub vs jj/Gerrit",
    content: [
      "Git/GitHub: 1 issue → ブランチ → 複数コミット → PR",
      "jj/Gerrit: 1 issue → 1 change → レビュー",
      "",
      "Git: すべてのコミットを共有",
      "jj: changeの最終形だけを共有",
      "",
      "Git: コミットを積み重ねる",
      "jj: 同じchangeを育てていく"
    ],
    duration: 270
  },
  {
    title: "jjの設計思想",
    content: [
      "Googleのエンジニアによって作られた",
      "Gerritワークフローをネイティブにサポート",
      "",
      "基本的に1つの修正 = 1つのchange",
      "説明を充実させていくスタイル",
      "作業履歴はローカルにとどめる",
      "共有するのは1つのchangeのみ"
    ],
    duration: 240
  },
  {
    title: "なぜブランチを使わないのか？",
    content: [
      "1つのchangeには1つの論理的な変更しか含まれない",
      "複数のchangeを「枝分かれ」させて管理する必要が薄い",
      "changeそのものが作業単位",
      "ブランチで区別する必要がない"
    ],
    duration: 210
  },
  {
    title: "squashとの違い",
    content: [
      "操作履歴(operation log)の自動記録",
      "ファイルを編集するだけで自動的にスナップショット",
      "すべての操作が記録される",
      "いつでも任意の時点に戻れる",
      "",
      "「共有する履歴」と「ローカルの操作履歴」を分離"
    ],
    duration: 240
  },
  {
    title: "この思想の革新性",
    content: [
      "✓ レビューが明確",
      "✓ 履歴がクリーンに育つ",
      "✓ ローカルで自由に育成",
      "✓ 概念がシンプル",
      "",
      "「なぜ今まで何十個も fix typo コミットを",
      " 積み重ねていたんだろう？」"
    ],
    duration: 240
  },
  {
    title: "まとめ",
    content: [
      "jjは単なる「Gitの代替ツール」ではない",
      "コードレビューとバージョン管理に対する",
      "根本的に異なる哲学を体現している",
      "",
      "changeを丁寧に育てるというアプローチは、",
      "新しい視点を与えてくれる"
    ],
    duration: 210
  }
];

// 合計動画時間を計算
export const totalDuration = articleData.reduce(
  (sum, section) => sum + section.duration,
  0
);
