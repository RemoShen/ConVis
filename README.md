## 一条条 array + backend (有 14 万 neuron 测试)

#### Highlights

- zoom in 和 levels slide bar 分开
- 按照 levels slide bar 的需求，实时从 backend load + render neurons

#### Dataset

zarr version = 3
public 里有 dataste_360.zarr, 每个 neuron 存进一个 array 里
如果要看所有 neuron 存进一个大 array 参见 branch 0605-1

dataset_all.zarr 是 14 万个 neuron 用同样的方式存入 zarr 的版本，但是太大了

#### Backend

Test: (具体看 backend.py)
http://127.0.0.1:8000
http://127.0.0.1:8000/neurons
http://localhost:8000/neuron/swcs%2F720575940606957257?start=0&stop=10000

#### Levels & Dendrogram

neuron_levels.js: 用于右下角 slide bar
neuron_dendrogram.js: 用于左下角 cluster tree

这两个用的还是 360 neurons 的版本，用 14 万个 neuron 生成这两个文件会内存爆炸

### How to run

Backend: cd Backend, uvicorn backend:app 如有需要 pip install -r requirements.txt
Frontend: npx vite 如有需要可以试试 main README 安装方法
