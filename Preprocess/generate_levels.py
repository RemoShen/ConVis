import random
import csv
import numpy as np
from collections import defaultdict

# GET LINKAGES
linkages = np.load('public/linkages.npy').astype(int).tolist()
print("LINKAGES = ", linkages)

# GET ID MAP
id_map = {}
with open('public/linkage_ids.csv', 'r') as f:
    reader = csv.reader(f, delimiter=' ', skipinitialspace=True)
    for row in reader:
        if len(row) == 2:
            idx, label = row
            id_map[int(idx)] = label
print("ID MAP = ", id_map)

# 初始化
num_neurons = len(id_map)

clusters = {i: [i + 1] for i in range(num_neurons)}
representatives = {i: i + 1 for i in range(num_neurons)}
levels = {"level1": [[i + 1] for i in range(num_neurons)]}
next_cluster_id = num_neurons
distance_to_clusters = defaultdict(list)

for a, b, dist, _ in linkages:
    distance_to_clusters[dist].append((a, b))

all_clusters = clusters.copy()
rep_map = representatives.copy()
level_num = 2

for dist in sorted(distance_to_clusters):
    merges = distance_to_clusters[dist]
    for a, b in merges:
        a = int(a)
        b = int(b)
        new_cluster = all_clusters[a] + all_clusters[b]
        rep = random.choice([rep_map[a], rep_map[b]])
        all_clusters[next_cluster_id] = new_cluster
        rep_map[next_cluster_id] = rep
        del all_clusters[a], all_clusters[b]
        del rep_map[a], rep_map[b]
        next_cluster_id += 1

    current = sorted([[rep] for rep in rep_map.values()], key=lambda x: x[0])
    levels[f"level{level_num}"] = current
    level_num += 1

# 转换为指定格式字符串
output = "export const levels = {\n"
for level, reps in levels.items():
    output += f"  {level}: [\n"
    for [r] in reps:
        swc_name = id_map[r - 1]  # r is 1-based
        output += f"    '/neurons/{swc_name}.swc',\n"
    output += "  ],\n"
output += "};\n"

# 写入文件
with open("toy_levels.js", "w") as f:
    f.write(output)
