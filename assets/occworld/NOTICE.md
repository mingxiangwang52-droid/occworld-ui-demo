# OccWorld official example images

Source: https://github.com/wzzheng/OccWorld
Upstream revision: 1ee7f77ecc4c984a4f7f6411d95c2e6e73806b6e
Authors: Wenzhao Zheng, Weiliang Chen, Yuanhui Huang, Borui Zhang, Yueqi Duan, Jiwen Lu.
Paper: OccWorld: Learning a 3D Occupancy World Model for Autonomous Driving, arXiv:2311.16038.
License: see official-LICENSE (Apache-2.0 as provided by the upstream repository).

## Modifications (2026-10-01)

- instance/observations.png and instance/prediction-*.png and instance/gt-*.png are crops of assets/overview.png from the upstream repository. Original annotations are retained; no model inference was run.
- instance/trajectory-*.png are newly plotted, explicitly labeled illustrations. They use manually transcribed rounded per-step motion annotations from the SAME overview.png and cumulative summation, inspired by torch.cumsum in model/TransVQVAE.py autoreg_for_stp3_metric. They are not original author-supplied trajectory screenshots or exact raw output.
- instance/provenance.json records transcribed data and derivation. The overview figure does not identify a standalone T0 frame, scene token, or full camera/pose transform metadata.
- official-overview.png is unmodified. The official planning.png in the source repository is an aggregate metrics table and must not be described as a trajectory visualization.
