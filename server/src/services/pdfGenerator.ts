import PDFDocument from 'pdfkit';
import { Graph } from '../algorithms/types';
import { NetworkRiskResult } from '../algorithms/risk';
import { DijkstraResult, BFSResult, DFSResult } from '../algorithms/types';

export interface ReportOptions {
  networkId: string;
  networkName: string;
  description: string;
  createdAt: Date;
  graph: Graph;
  riskResult: NetworkRiskResult;
  dijkstraRes?: DijkstraResult;
  bfsRes?: BFSResult;
  dfsRes?: DFSResult;
}

export function generatePdfReport(options: ReportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const charcoal = '#2E2C29';
      const burntCopper = '#C98662';
      const lightGrey = '#7A7A7A';

      // --- PAGE 1: Overview & Risk ---
      doc.font('Helvetica-Bold').fontSize(24).fillColor(charcoal)
         .text('CYBERGRAPH', { align: 'center' });
      doc.font('Helvetica').fontSize(14).fillColor(burntCopper)
         .text('Security Analysis Report', { align: 'center' });
      doc.moveDown(2);

      doc.font('Helvetica-Bold').fontSize(16).fillColor(charcoal).text('Network Overview');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(12).fillColor(charcoal);
      doc.text(`Name: ${options.networkName}`);
      if (options.description) {
        doc.text(`Description: ${options.description}`);
      }
      doc.text(`Nodes: ${options.graph.nodes.size}`);
      doc.text(`Edges: ${options.graph.edges.size}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown(2);

      doc.font('Helvetica-Bold').fontSize(16).fillColor(charcoal).text('Network Risk');
      doc.moveDown(0.5);
      
      const netRisk = options.riskResult.network;
      doc.font('Helvetica-Bold').fontSize(14)
         .fillColor(netRisk.level === 'CRITICAL' || netRisk.level === 'HIGH' ? '#D9534F' : burntCopper)
         .text(`Score: ${netRisk.score.toFixed(1)} / 10 (${netRisk.level})`);
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(12).fillColor(charcoal).text('Critical Risk Nodes:');
      doc.font('Helvetica').fontSize(10);
      if (options.riskResult.criticalRiskNodes.length === 0) {
        doc.text('None');
      } else {
        options.riskResult.criticalRiskNodes.forEach(nodeId => {
          const node = options.graph.nodes.get(nodeId);
          if (node) {
            doc.text(`- ${node.name} (${node.type})`);
          }
        });
      }

      if (options.graph.nodes.size === 0) {
        doc.moveDown(2);
        doc.font('Helvetica-Oblique').fontSize(12).fillColor(lightGrey)
           .text('Network contains no nodes for analysis.', { align: 'center' });
      } else if (options.graph.edges.size === 0) {
        doc.moveDown(2);
        doc.font('Helvetica-Oblique').fontSize(12).fillColor(lightGrey)
           .text('Network contains nodes but no edge connections are currently defined.', { align: 'center' });
      }

      // --- PAGE 2: Topology Visualization ---
      if (options.graph.nodes.size > 0) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(16).fillColor(charcoal).text('Network Topology');
        doc.moveDown(1);
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        options.graph.nodes.forEach(node => {
          const x = node.positionX ?? 0;
          const y = node.positionY ?? 0;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        });

        // Add padding
        minX -= 50; minY -= 50; maxX += 50; maxY += 50;
        const width = maxX - minX || 1;
        const height = maxY - minY || 1;

        const drawWidth = doc.page.width - 100;
        const drawHeight = doc.page.height - 200;

        const scale = Math.min(drawWidth / width, drawHeight / height);

        const offsetX = 50 - (minX * scale);
        const offsetY = doc.y - (minY * scale);
        
        // Draw Edges
        doc.lineWidth(1);
        options.graph.edges.forEach(edge => {
          const src = options.graph.nodes.get(edge.sourceId);
          const tgt = options.graph.nodes.get(edge.targetId);
          if (src && tgt) {
            const x1 = offsetX + (src.positionX ?? 0) * scale;
            const y1 = offsetY + (src.positionY ?? 0) * scale;
            const x2 = offsetX + (tgt.positionX ?? 0) * scale;
            const y2 = offsetY + (tgt.positionY ?? 0) * scale;
            doc.strokeColor(lightGrey).moveTo(x1, y1).lineTo(x2, y2).stroke();
            
            if (edge.directed) {
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len > 0) {
                const hx = x2 - (dx / len) * 8;
                const hy = y2 - (dy / len) * 8;
                doc.circle(hx, hy, 2).fill(charcoal);
              }
            }
          }
        });

        // Draw Nodes
        options.graph.nodes.forEach(node => {
          const x = offsetX + (node.positionX ?? 0) * scale;
          const y = offsetY + (node.positionY ?? 0) * scale;
          doc.circle(x, y, 6).fillAndStroke(charcoal, charcoal);
          doc.fontSize(8).fillColor(charcoal).text(node.name, x + 8, y - 4, { lineBreak: false });
        });
      }

      // --- PAGE 3: Algorithm & Risk Assessment ---
      if (options.graph.nodes.size > 0) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(16).fillColor(charcoal).text('Risk Assessment Details');
        doc.moveDown(1);
        
        // Table Header
        doc.font('Helvetica-Bold').fontSize(9).fillColor(charcoal);
        const startY = doc.y;
        doc.text('NODE', 50, startY);
        doc.text('TYPE', 200, startY);
        doc.text('VULN', 300, startY);
        doc.text('CRIT', 350, startY);
        doc.text('EXPO', 400, startY);
        doc.text('RISK', 450, startY);
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(500, doc.y).strokeColor(lightGrey).lineWidth(0.5).stroke();
        doc.moveDown(0.5);

        // Table Rows
        doc.font('Helvetica').fontSize(9);
        options.riskResult.nodes.forEach(riskNode => {
          const node = options.graph.nodes.get(riskNode.nodeId);
          if (!node) return;
          const y = doc.y;
          doc.fillColor(charcoal).text(node.name, 50, y, { width: 140, ellipsis: true });
          doc.text(node.type, 200, y, { width: 90, ellipsis: true });
          doc.text(riskNode.components.vulnerability.toFixed(1), 300, y);
          doc.text(riskNode.components.criticality.toFixed(1), 350, y);
          doc.text(riskNode.components.exposure.toFixed(1), 400, y);
          doc.fillColor(riskNode.level === 'CRITICAL' || riskNode.level === 'HIGH' ? '#D9534F' : charcoal)
             .text(riskNode.score.toFixed(1), 450, y);
          doc.moveDown(0.5);
          if (doc.y > doc.page.height - 100) doc.addPage();
        });
      }

      // --- PAGE 4: Dijkstra Result (if provided) ---
      if (options.dijkstraRes) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(16).fillColor(charcoal).text('Path Analysis (Dijkstra)');
        doc.moveDown(1);
        
        const src = options.graph.nodes.get(options.dijkstraRes.sourceNodeId);
        const tgt = options.graph.nodes.get(options.dijkstraRes.targetNodeId);
        
        doc.font('Helvetica-Bold').fontSize(12).fillColor(charcoal).text('Source: ');
        doc.font('Helvetica').text(src ? src.name : options.dijkstraRes.sourceNodeId);
        doc.moveDown(0.5);
        
        doc.font('Helvetica-Bold').fontSize(12).text('Target: ');
        doc.font('Helvetica').text(tgt ? tgt.name : options.dijkstraRes.targetNodeId);
        doc.moveDown(1);

        if (!options.dijkstraRes.reachable) {
          doc.font('Helvetica-Oblique').fillColor(lightGrey).text('Target is unreachable from source.');
        } else {
          doc.font('Helvetica-Bold').fillColor(charcoal).text('Path:');
          doc.font('Helvetica');
          let pathStr = '';
          options.dijkstraRes.path.forEach((id, idx) => {
            const n = options.graph.nodes.get(id);
            pathStr += (n ? n.name : id);
            if (idx < options.dijkstraRes!.path.length - 1) pathStr += ' → ';
          });
          doc.text(pathStr);
          doc.moveDown(1);

          doc.font('Helvetica-Bold').text(`Total Cost: `).font('Helvetica').text(String(options.dijkstraRes.totalCost));
          doc.font('Helvetica-Bold').text(`Hops: `).font('Helvetica').text(String(options.dijkstraRes.path.length - 1));
          
          if (options.riskResult.path) {
            doc.font('Helvetica-Bold').text(`Path Risk: `).font('Helvetica').text(`${options.riskResult.path.score.toFixed(1)} / 10`);
            const pathRisk = options.riskResult.path;
            
            // Generate deterministic explanation
            const topNode = pathRisk.nodes.reduce((prev, current) => (prev.score > current.score) ? prev : current, pathRisk.nodes[0]);
            if (topNode) {
              const gNode = options.graph.nodes.get(topNode.nodeId);
              doc.moveDown(1);
              doc.font('Helvetica-Oblique').fontSize(10).fillColor(lightGrey)
                 .text(`${gNode?.name} has a high risk score primarily due to its vulnerability (${topNode.components.vulnerability}) and criticality (${topNode.components.criticality}) components.`);
            }
          }
        }
      }

      // Add Headers/Footers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(lightGrey)
           .text('CYBERGRAPH', 50, 30);
        doc.font('Helvetica').fontSize(9)
           .text(`Security Analysis Report | Page ${i + 1}`, 50, doc.page.height - 40, { align: 'center' });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
