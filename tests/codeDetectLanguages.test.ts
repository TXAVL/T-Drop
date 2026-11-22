import { describe, expect, it } from 'vitest'
import { detectCode, prismGrammar } from '../src/lib/codeDetect'

const cases: [string, string, string][] = [
  ['txa', '\uFEFFTXA-ARCHIVE-V1 [ENCRYPTED T-DROP BACKUP]\r\n====\r\nTệp này là bản sao lưu', 'txa'],
  ['txa (manifest)', '{"app":"T-Drop","version":"0.3.2","createdAt":"2026-11-22","itemsCount":3}', 'txa'],
  ['txa (txapm)', 'txapm install TXAVL.TDrop', 'txa'],
  ['react', "import { useState } from 'react'\nexport function A() {\n  const [n, setN] = useState(0)\n  return <button onClick={() => setN(n + 1)}>{n}</button>\n}", 'react'],
  ['nextjs', "'use client'\nimport Link from 'next/link'\nexport default function P() { return <Link href=\"/\">home</Link> }", 'nextjs'],
  ['vue', '<template>\n  <div v-if="ok">{{ msg }}</div>\n</template>\n<script setup>\nconst msg = "hi"\n</script>', 'vue'],
  ['svelte', '<script>\n  let n = 0\n</script>\n{#if n > 0}\n  <p>{n}</p>\n{/if}\n<button on:click={() => n++}>+</button>', 'svelte'],
  ['angular', "@Component({\n  selector: 'app-x',\n  templateUrl: './x.html'\n})\nexport class X {}", 'angular'],
  ['express', "const express = require('express')\nconst app = express()\napp.listen(3000)", 'express'],
  ['astro', '---\nconst { title } = Astro.props\n---\n<h1>{title}</h1>', 'astro'],
  ['ruby (rails)', 'class User < ApplicationRecord\n  has_many :posts\n  validates :name, presence: true\nend', 'ruby'],
  ['ruby (blocks)', 'items.each do |item|\n  puts "#{item}"\nend', 'ruby'],
  ['ruby (gemfile)', "source 'https://rubygems.org'\ngem 'rails'\ngem 'pg'", 'ruby'],
  ['lua (neovim)', 'vim.keymap.set("n", "<leader>w", ":w<CR>")\nvim.opt.number = true', 'lua'],
  ['lua (loop)', 'for i, v in ipairs(items) do\n  if v ~= nil then print(v) end\nend', 'lua'],
  ['kotlin', 'data class User(val id: Int, val name: String)\nfun greet(u: User) = println("hi ${u.name}")', 'kotlin'],
  ['swift', 'import SwiftUI\nstruct ContentView: View {\n  var body: some View { Text("hi") }\n}', 'swift'],
  ['java', 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("hi");\n  }\n}', 'java'],
  ['php', '<?php\necho "hi";', 'php'],
  ['ruby', 'def greet(name)\n  puts "hi #{name}"\nend', 'ruby'],
  ['dart', "import 'package:flutter/material.dart';\nvoid main() { runApp(MyApp()); }", 'dart'],
  ['lua', 'local function add(a, b)\n  return a + b\nend', 'lua'],
  ['zig', 'const std = @import("std");\npub fn main() void {\n  std.debug.print("hi", .{});\n}', 'zig'],
  ['mojo', 'struct Point:\n    var x: Int\n    fn __init__(inout self, x: Int):\n        self.x = x', 'mojo'],
  ['gleam', 'import gleam/io\npub fn main() {\n  io.println("hi")\n}', 'gleam'],
  ['elixir', 'defmodule Greeter do\n  def hi(name) do\n    IO.puts("hi #{name}")\n  end\nend', 'elixir'],
  ['haskell', 'module Main where\nmain :: IO ()\nmain = putStrLn "hi"', 'haskell'],
  ['julia', 'using LinearAlgebra\nfunction f(x::Int)\n  x + 1\nend', 'julia'],
  ['nim', 'proc add(a, b: int): int =\n  a + b\necho add(1, 2)', 'nim'],
  ['scala', 'case class User(name: String)\ndef greet(u: User): String = s"hi ${u.name}"', 'scala'],
  ['yaml', 'name: build\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest', 'yaml'],
  ['toml', '[package]\nname = "app"\nversion = "0.1.0"', 'toml'],
  ['powershell', 'Get-ChildItem -Path C:\ | Where-Object { $_.Length -gt 1MB }', 'powershell'],
  ['dockerfile', 'FROM node:20\nWORKDIR /app\nCOPY . .\nRUN npm ci', 'dockerfile']
]

describe('detectCode: newer languages and .txa', () => {
  for (const [name, code, lang] of cases) {
    it(`detects ${name}`, () => {
      const r = detectCode(code)
      expect(r.isCode).toBe(true)
      expect(r.language).toBe(lang)
    })
  }

  it('keeps the common languages unchanged', () => {
    expect(detectCode('fn main() {\n  println!("hi");\n}').language).toBe('rust')
    expect(detectCode('package main\nfunc main() {\n  fmt.Println("hi")\n}').language).toBe('go')
    expect(detectCode('def f(x):\n    return x\nprint(f(1))').language).toBe('python')
    expect(detectCode('const a: number = 1\nconsole.log(a)').language).toBe('typescript')
  })

  it('does not treat plain prose as code', () => {
    expect(detectCode('Hello there, this is just a sentence.').isCode).toBe(false)
  })

  it('maps grammars that are not bundled to a bundled one', () => {
    expect(prismGrammar('java')).toBe('clike')
    expect(prismGrammar('typescript')).toBe('typescript')
  })
})
