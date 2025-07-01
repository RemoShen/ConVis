# 这是把所有swc变成zarr的代码

import os
import numpy as np
import zarr
from zarr.codecs import BloscCodec, BloscCname

INPUT_DIR = "/Users/yungew/Storage/ConVis/Dataset/simplified_neurons" # change this
OUTPUT_ZARR = "dataset_chunk_v3.zarr" 

file_list = sorted(os.listdir(INPUT_DIR))
N = len(file_list)  # neuron 数量
FIXED_SHAPE = (10, 7)

root = zarr.open_group(store=OUTPUT_ZARR, mode='w', zarr_format=3)

z = root.create_array(
    name="neuron_array",
    shape=(N, *FIXED_SHAPE),  # -> (N, 10, 7)
    dtype='float32',
    chunks=(512, 10, 7),
    shards=(2048, 10, 7),
    compressors=(BloscCodec(cname=BloscCname.zstd, clevel=3),),
)

neuron_ids = []

for i, fname in enumerate(file_list):
    path = os.path.join(INPUT_DIR, fname)
    swc_id = os.path.splitext(fname)[0]
    try:
        arr = np.loadtxt(path, dtype=np.float32)
    except Exception as e:
        print(f"❌ Failed {fname}: {e}")
        continue

    if arr.shape != FIXED_SHAPE:
        print(f"⚠️ {fname} shape mismatch: {arr.shape}, skipping")
        continue

    z[i, :, :] = arr
    neuron_ids.append(swc_id)

    if i % 1000 == 0:
        print(f"[{i}/{N}] {swc_id}")

root.attrs["neuron_ids"] = neuron_ids
