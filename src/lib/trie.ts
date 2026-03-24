
class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  videoIds: string[];

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.videoIds = [];
  }
}

export class VideoTrie {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string, videoId: string) {
    let current = this.root;
    for (const char of word.toLowerCase()) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
      // We also add videoIds to intermediate nodes for faster prefix searching
      if (!current.videoIds.includes(videoId)) {
        current.videoIds.push(videoId);
      }
    }
    current.isEndOfWord = true;
  }

  search(prefix: string): string[] {
    let current = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }
    return current.videoIds;
  }
}
