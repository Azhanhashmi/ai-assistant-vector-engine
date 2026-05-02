#include <iostream>
#include <vector>
#include <unordered_map>
#include <queue>
#include <random>
#include <algorithm>
#include <cmath>
#include <sstream>
#include <string>

float cosine_distance(const std::vector<float>& a, const std::vector<float>& b) {
    float dot = 0, ma = 0, mb = 0;
    for (int i = 0; i < (int)a.size(); i++) {
        dot += a[i] * b[i];
        ma  += a[i] * a[i];
        mb  += b[i] * b[i];
    }
    if (ma < 1e-9f || mb < 1e-9f) return 1.0f;
    return 1.0f - dot / (std::sqrt(ma) * std::sqrt(mb));
}

struct Node {
    int id;
    std::vector<float> vec;
    int top_layer;
    std::vector<std::vector<int>> neighbours;
};

class HNSW {
public:
    int M, M0, ef_build;
    float mL;
    std::unordered_map<int, Node> graph;
    int entry_point = -1;
    int top_layer   = -1;
    std::mt19937 rng;

    HNSW(int m = 16, int ef = 200)
        : M(m), M0(2 * m), ef_build(ef),
          mL(1.0f / std::log((float)m)),
          rng(42) {}

    int random_level() {
        std::uniform_real_distribution<float> dist(0.0f, 1.0f);
        return (int)std::floor(-std::log(dist(rng)) * mL);
    }

std::vector<std::pair<float,int> > search_layer(
        const std::vector<float>& q,
        int ep, int ef, int layer)
    {
        std::unordered_map<int, bool> visited;
        typedef std::pair<float,int> PFI;
        typedef std::vector<PFI> VPFI;
        typedef std::priority_queue<PFI, VPFI, std::greater<PFI> > MinHeap;
        typedef std::priority_queue<PFI> MaxHeap;

        MinHeap candidates;
        MaxHeap found;
        
    float dist = cosine_distance(q, graph[ep].vec);
    candidates.push(std::make_pair(dist, ep));
    found.push(std::make_pair(dist, ep));
    visited[ep] = true;

        while (!candidates.empty()) {
            float cd  = candidates.top().first;
            int   cid = candidates.top().second;
            candidates.pop();

            if ((int)found.size() >= ef && cd > found.top().first)
                break;

            if (layer >= (int)graph[cid].neighbours.size()) continue;

            for (int nid : graph[cid].neighbours[layer]) {
                if (visited[nid] || !graph.count(nid)) continue;
                visited[nid] = true;

                float nd = cosine_distance(q, graph[nid].vec);

                if ((int)found.size() < ef || nd < found.top().first) {
                    candidates.push(std::make_pair(nd, nid));
                    found.push(std::make_pair(nd, nid));
                    if ((int)found.size() > ef) found.pop();
                }
            }
        }

        std::vector<std::pair<float,int>> result;
        while (!found.empty()) {
            result.push_back(found.top());
            found.pop();
        }
        std::sort(result.begin(), result.end());
        return result;
    }

    void insert(int id, const std::vector<float>& vec) {
        int lvl = random_level();

        Node node;
        node.id        = id;
        node.vec       = vec;
        node.top_layer = lvl;
        node.neighbours.resize(lvl + 1);
        graph[id] = node;

        if (entry_point == -1) {
            entry_point = id;
            top_layer   = lvl;
            return;
        }

        int ep = entry_point;

        for (int lc = top_layer; lc > lvl; lc--) {
            auto W = search_layer(vec, ep, 1, lc);
            if (!W.empty()) ep = W[0].second;
        }

        for (int lc = std::min(top_layer, lvl); lc >= 0; lc--) {
            int max_conn = (lc == 0) ? M0 : M;

            auto W = search_layer(vec, ep, ef_build, lc);

            std::vector<int> selected;
            for (int i = 0; i < std::min((int)W.size(), max_conn); i++)
                selected.push_back(W[i].second);

            graph[id].neighbours[lc] = selected;

            for (int nid : selected) {
                if (!graph.count(nid)) continue;
                if ((int)graph[nid].neighbours.size() <= lc)
                    graph[nid].neighbours.resize(lc + 1);

                auto& conn = graph[nid].neighbours[lc];
                conn.push_back(id);

                if ((int)conn.size() > max_conn) {
                    std::vector<std::pair<float,int>> ds;
                    for (int c : conn)
                        if (graph.count(c))
                            ds.push_back(std::make_pair(
                                cosine_distance(graph[nid].vec, graph[c].vec), c));
                    std::sort(ds.begin(), ds.end());
                    conn.clear();
                    for (int i = 0; i < max_conn && i < (int)ds.size(); i++)
                        conn.push_back(ds[i].second);
                }
            }

            if (!W.empty()) ep = W[0].second;
        }

        if (lvl > top_layer) {
            top_layer   = lvl;
            entry_point = id;
        }
    }

    std::vector<std::pair<float,int>> knn(
        const std::vector<float>& q, int k, int ef = 50)
    {
        if (entry_point == -1) return {};

        int ep = entry_point;

        for (int lc = top_layer; lc > 0; lc--) {
            auto W = search_layer(q, ep, 1, lc);
            if (!W.empty()) ep = W[0].second;
        }

        auto W = search_layer(q, ep, std::max(ef, k), 0);
        if ((int)W.size() > k) W.resize(k);
        return W;
    }

    void remove(int id) {
        if (!graph.count(id)) return;

        for (auto it = graph.begin(); it != graph.end(); ++it) {
            for (auto& layer : it->second.neighbours) {
                layer.erase(
                    std::remove(layer.begin(), layer.end(), id),
                    layer.end());
            }
        }

        if (entry_point == id) {
            entry_point = -1;
            for (auto it = graph.begin(); it != graph.end(); ++it) {
                if (it->first != id) { entry_point = it->first; break; }
            }
        }

        graph.erase(id);
    }

    int size() { return (int)graph.size(); }
};

std::vector<float> parse_vec(const std::string& s) {
    std::vector<float> v;
    std::istringstream ss(s);
    float x;
    while (ss >> x) v.push_back(x);
    return v;
}

int main() {
    HNSW hnsw(16, 200);
    std::string line;

    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        if (line.substr(0, 6) == "INSERT") {
            std::istringstream ss(line.substr(7));
            int id; ss >> id;
            std::string rest;
            std::getline(ss, rest);
            hnsw.insert(id, parse_vec(rest));
            std::cout << "OK" << std::endl;
        }
     else if (line.substr(0, 6) == "SEARCH") {
    std::istringstream ss(line.substr(7));
    int k; ss >> k;
    std::string rest;
    std::getline(ss, rest);
    std::vector<float> q = parse_vec(rest);
    std::cerr << "DEBUG: k=" << k << " vec_size=" << q.size() << std::endl;
    auto results = hnsw.knn(q, k);
    std::cerr << "DEBUG: results=" << results.size() << std::endl;
    if (results.empty()) {
        std::cout << "EMPTY" << std::endl;
    } else {
        for (int i = 0; i < (int)results.size(); i++) {
            if (i) std::cout << ' ';
            std::cout << results[i].second << ':' << results[i].first;
        }
        std::cout << std::endl;
    }
}
        else if (line.substr(0, 6) == "DELETE") {
            int id = std::stoi(line.substr(7));
            hnsw.remove(id);
            std::cout << "OK" << std::endl;
        }
        else if (line.substr(0, 4) == "SIZE") {
            std::cout << hnsw.size() << std::endl;
        }
    }

    return 0;
}