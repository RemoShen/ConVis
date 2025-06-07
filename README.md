## 一个大 array + zarr.js

#### dataset_360_chunk.zarr

zarr version = 2  
neurons 保存在了 361 \* 100 \* 7 的巨大的名叫 huge_chunk 的 array 里  
.zattrs 里有所有 neuron 的名字"720575940601568777"...  

### Problems

- 可能 path 有问题，无法显示右上角每个 neuron 的 meta info  
