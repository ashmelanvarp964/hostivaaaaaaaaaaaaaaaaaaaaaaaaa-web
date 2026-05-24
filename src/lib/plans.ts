export interface Plan {
  id: string;
  name: string;
  price: number | string;
  category: "budget" | "performance";
  hardware: string;
  features: string[];
  specs: {
    cpu: string;
    ram: string;
    disk: string;
    backups: number | string;
    ports: number | string;
    databases?: number | string;
    nestId: number;
    eggId: number;
    locationId: number;
    nodeId?: number;
  };
  recommended?: boolean;
  paymentLink?: string;
}

export const plans: Plan[] = [
  // PERFORMANCE PLANS (ALL POWERED BY AMD RYZEN 9)
  {
    id: "perf-iron",
    name: "Premium Iron Plan",
    price: 550,
    category: "performance",
    hardware: "AMD RYZEN 9",
    features: ["High Frequency Ryzen 9 CPU", "DDR4 ECC Memory", "NVMe SSD Storage"],
    specs: { cpu: "200%", ram: "8 GB", disk: "20 GB", backups: 1, ports: 1, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },
  {
    id: "perf-gold",
    name: "Premium Gold Plan",
    price: 880,
    category: "performance",
    hardware: "AMD RYZEN 9",
    features: ["High Frequency Ryzen 9 CPU", "DDR4 ECC Memory", "NVMe SSD Storage"],
    specs: { cpu: "400%", ram: "16 GB", disk: "50 GB", backups: 1, ports: 5, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },
  {
    id: "perf-emerald",
    name: "Premium Emerald Plan",
    price: 1090,
    category: "performance",
    hardware: "AMD RYZEN 9",
    features: ["High Frequency Ryzen 9 CPU", "DDR4 ECC Memory", "NVMe SSD Storage"],
    specs: { cpu: "450%", ram: "24 GB", disk: "60 GB", backups: 2, ports: 2, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 },
    recommended: true
  },
  {
    id: "perf-obsidian",
    name: "Premium Obsidian Plan",
    price: 1399,
    category: "performance",
    hardware: "AMD RYZEN 9",
    features: ["High Frequency Ryzen 9 CPU", "DDR4 ECC Memory", "NVMe SSD Storage"],
    specs: { cpu: "500%", ram: "32 GB", disk: "80 GB", backups: 3, ports: 1, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },
  {
    id: "perf-netherite",
    name: "Premium Netherite Plan",
    price: 1699,
    category: "performance",
    hardware: "AMD RYZEN 9",
    features: ["High Frequency Ryzen 9 CPU", "DDR4 ECC Memory", "NVMe SSD Storage"],
    specs: { cpu: "600%", ram: "48 GB", disk: "100 GB", backups: 4, ports: 2, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },
  {
    id: "perf-gladiator",
    name: "Premium Gladiator Plan",
    price: 2199,
    category: "performance",
    hardware: "AMD RYZEN 9",
    features: ["High Frequency Ryzen 9 CPU", "DDR4 ECC Memory", "NVMe SSD Storage"],
    specs: { cpu: "800%", ram: "64 GB", disk: "150 GB", backups: 5, ports: 1, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },

  // BUDGET PLANS (INTEL / CHEAP NODE)
  {
    id: "budget-classic",
    name: "Classic Plan",
    price: 100,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "Basic Support", "SSD Storage"],
    specs: { cpu: "120%", ram: "6GB", disk: "20GB", backups: 1, ports: 0, databases: 1, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    paymentLink: "https://rzp.io/rzp/0gS0Hmvr"
  },
  {
    id: "budget-epic",
    name: "Epic Plan",
    price: 200,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "Basic Support", "SSD Storage"],
    specs: { cpu: "180%", ram: "10GB", disk: "40GB", backups: 3, ports: 1, databases: 2, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    recommended: true,
    paymentLink: "https://rzp.io/rzp/v1HXLLs1"
  },
  {
    id: "budget-pro",
    name: "Pro Plan",
    price: 300,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "Standard Support", "SSD Storage"],
    specs: { cpu: "250%", ram: "16GB", disk: "60GB", backups: 4, ports: 2, databases: 2, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    paymentLink: "https://rzp.io/rzp/ox9kJuqm"
  },
  {
    id: "budget-power",
    name: "Power Plan",
    price: 400,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "24/7 Support", "SSD Storage"],
    specs: { cpu: "300%", ram: "24GB", disk: "80GB", backups: 5, ports: 3, databases: 3, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    paymentLink: "https://rzp.io/rzp/qP6wEcNv"
  },
  {
    id: "budget-mega",
    name: "Mega Plan",
    price: 600,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "Priority Support", "SSD Storage"],
    specs: { cpu: "400%", ram: "32GB", disk: "150GB", backups: 7, ports: 5, databases: 5, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    paymentLink: "https://rzp.io/rzp/bR6SsWm"
  },
  {
    id: "budget-custom",
    name: "Custom Plan",
    price: "Custom",
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Custom Ram Allocation", "Custom Disk SSD Space", "SLA Support Setup"],
    specs: { cpu: "Custom", ram: "Custom", disk: "Custom", backups: "Custom", ports: "Custom", databases: "Custom", nestId: 1, eggId: 4, locationId: 1, nodeId: 9 }
  }
];
