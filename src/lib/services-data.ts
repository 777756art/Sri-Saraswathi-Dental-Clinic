import { ServicePageData } from "@/types";

export const servicesData: Record<string, ServicePageData> = {
  "general-dentistry": {
    title: "General Dentistry",
    description: "Comprehensive preventive and diagnostic dental care for the whole family.",
    overview:
      "Our general dentistry services form the foundation of good oral health. From routine check-ups and professional cleanings to fillings and preventive treatments, we use AI-powered diagnostics to detect issues early and provide personalized care plans. Our state-of-the-art digital X-rays and intraoral cameras ensure accurate diagnosis with minimal radiation exposure.",
    benefits: [
      "Early detection of dental issues through AI-powered diagnostics",
      "Personalized preventive care plans",
      "Digital X-rays with 90% less radiation",
      "Comfortable, anxiety-free environment",
      "Flexible scheduling with same-day appointments",
      "Comprehensive family dental care",
    ],
    procedureSteps: [
      {
        title: "Initial Consultation",
        description: "Review medical history, discuss concerns, and set treatment goals.",
      },
      {
        title: "AI-Powered Examination",
        description: "Digital X-rays, intraoral scanning, and AI analysis for comprehensive diagnosis.",
      },
      {
        title: "Professional Cleaning",
        description: "Removal of plaque, tartar, and polishing for optimal oral hygiene.",
      },
      {
        title: "Treatment Planning",
        description: "Personalized care plan with AI-generated recommendations and cost estimates.",
      },
      {
        title: "Follow-Up Schedule",
        description: "Automated reminders for next visit and ongoing oral care tips.",
      },
    ],
    estimatedDuration: "45-60 minutes per visit",
    recoveryGuidance: [
      "Continue regular brushing and flossing",
      "Avoid eating for 30 minutes after fluoride treatment",
      "Use sensitivity toothpaste if needed",
      "Schedule follow-up in 6 months",
      "Maintain good oral hygiene routine",
    ],
    faqs: [
      {
        question: "How often should I visit the dentist?",
        answer:
          "We recommend every 6 months for routine check-ups and cleanings. However, our AI system may suggest more frequent visits based on your oral health profile and risk factors.",
      },
      {
        question: "Does dental cleaning hurt?",
        answer:
          "Most patients experience minimal discomfort. Our team uses gentle techniques and can provide numbing gel if needed. The AI-powered cleaning tools are designed for maximum comfort.",
      },
      {
        question: "What does a check-up include?",
        answer:
          "A comprehensive exam including AI-assisted digital X-rays, oral cancer screening, gum disease evaluation, professional cleaning, and personalized treatment recommendations.",
      },
      {
        question: "Do you accept new patients?",
        answer:
          "Yes! We welcome new patients and offer a free initial consultation. You can book online, and our AI system will help match you with the right dentist.",
      },
    ],
    priceRange: "₹999 – ₹2,999",
  },

  "cosmetic-dentistry": {
    title: "Cosmetic Dentistry",
    description: "Transform your smile with AI-enhanced cosmetic procedures.",
    overview:
      "Cosmetic dentistry combines art and science to create beautiful, natural-looking smiles. Using AI-powered smile simulation and digital treatment planning, we can show you your potential results before treatment begins. From subtle enhancements to complete smile makeovers, our cosmetic specialists use the latest technology for predictable, stunning results.",
    benefits: [
      "AI smile simulation to preview results",
      "Minimally invasive techniques",
      "Customized treatment plans",
      "Natural-looking results",
      "Long-lasting durability",
      "Boosted confidence and self-esteem",
    ],
    procedureSteps: [
      {
        title: "Smile Consultation",
        description: "Discuss goals and use AI simulation to preview possible outcomes.",
      },
      {
        title: "Digital Smile Design",
        description: "3D scanning and digital planning for precise treatment execution.",
      },
      {
        title: "Custom Preparation",
        description: "Minimally invasive preparation using AI-guided precision tools.",
      },
      {
        title: "Restoration Placement",
        description: "Expert placement of veneers, bonding, or other cosmetic solutions.",
      },
      {
        title: "Final Adjustments",
        description: "Fine-tuning for perfect bite, comfort, and aesthetics.",
      },
    ],
    estimatedDuration: "1-3 visits depending on treatment",
    recoveryGuidance: [
      "Avoid staining foods for 48 hours",
      "Use non-abrasive toothpaste",
      "Wear night guard if you grind teeth",
      "Schedule regular check-ups",
      "Follow specific care instructions provided",
    ],
    faqs: [
      {
        question: "How long do cosmetic dental results last?",
        answer:
          "With proper care, veneers can last 10-15 years, bonding 5-7 years, and whitening results 1-3 years. Our AI follow-up system will remind you when maintenance is due.",
      },
      {
        question: "Is cosmetic dentistry painful?",
        answer:
          "Most procedures are minimally invasive and performed under local anesthesia. Patients report little to no discomfort during treatment.",
      },
      {
        question: "Can I see my results before treatment?",
        answer:
          "Yes! Our AI-powered smile simulation shows you a preview of your potential results, allowing you to make informed decisions about your treatment.",
      },
    ],
    priceRange: "₹5,000 – ₹1,50,000",
  },

  "teeth-whitening": {
    title: "Teeth Whitening",
    description: "Professional teeth whitening with AI-optimized treatments for brighter smiles.",
    overview:
      "Our professional teeth whitening system combines advanced light technology with AI-optimized treatment protocols for safe, effective, and long-lasting results. Unlike over-the-counter products, our in-office treatment provides immediate visible results with customized formulas that minimize sensitivity.",
    benefits: [
      "Immediate visible results after one session",
      "Customized to your tooth sensitivity level",
      "AI-optimized treatment duration",
      "Longer-lasting results than store-bought kits",
      "Safe, dentist-supervised application",
      "Take-home kits available for maintenance",
    ],
    procedureSteps: [
      {
        title: "Shade Assessment",
        description: "AI color analysis to determine current shade and target results.",
      },
      {
        title: "Gum Protection",
        description: "Protective barrier applied to gums to prevent irritation.",
      },
      {
        title: "Whitening Application",
        description: "Professional-grade gel applied with AI-monitored activation.",
      },
      {
        title: "Light Activation",
        description: "Advanced LED light accelerates the whitening process.",
      },
      {
        title: "Results Assessment",
        description: "AI color analysis to measure improvement and recommend maintenance.",
      },
    ],
    estimatedDuration: "60-90 minutes per session",
    recoveryGuidance: [
      "Avoid coffee, tea, and red wine for 48 hours",
      "Use sensitivity toothpaste if needed",
      "Avoid smoking for 48 hours",
      "Brush gently for the first day",
      "Use provided take-home kit for maintenance",
    ],
    faqs: [
      {
        question: "How white will my teeth get?",
        answer:
          "Results vary by person, but most patients see 3-8 shades of improvement after one session. Our AI assessment will give you a personalized prediction.",
      },
      {
        question: "Is teeth whitening safe?",
        answer:
          "Yes, when performed by professionals. Our AI system monitors the process to ensure optimal results with minimal sensitivity.",
      },
      {
        question: "How long do results last?",
        answer:
          "With proper care, results last 6-12 months. Our AI follow-up system will remind you when touch-up treatments are recommended.",
      },
    ],
    priceRange: "₹2,999 – ₹8,000",
  },

  "dental-implants": {
    title: "Dental Implants",
    description: "Permanent tooth replacement with AI-guided implant placement for precision and longevity.",
    overview:
      "Dental implants are the gold standard for replacing missing teeth. Using AI-guided 3D planning and computer-assisted surgery, we achieve precise implant placement with predictable results. Our digital workflow from planning to restoration ensures optimal aesthetics, function, and long-term success.",
    benefits: [
      "AI-guided precision placement",
      "Natural look and feel",
      "Permanent solution for missing teeth",
      "Prevents bone loss and facial sagging",
      "No damage to adjacent teeth",
      "Over 95% success rate",
    ],
    procedureSteps: [
      {
        title: "3D Imaging & Planning",
        description: "CBCT scan and AI-powered 3D treatment planning for precise implant positioning.",
      },
      {
        title: "Implant Placement",
        description: "Computer-guided surgery for minimally invasive, precise placement.",
      },
      {
        title: "Osseointegration Period",
        description: "3-6 months healing period for bone to fuse with implant.",
      },
      {
        title: "Abutment Placement",
        description: "Connector piece attached to implant to support the crown.",
      },
      {
        title: "Crown Restoration",
        description: "Custom-crafted crown attached for natural-looking final result.",
      },
    ],
    estimatedDuration: "3-6 months complete process",
    recoveryGuidance: [
      "Soft food diet for first week",
      "Avoid strenuous activity for 48 hours",
      "Use prescribed mouth rinse",
      "Attend follow-up appointments",
      "Maintain excellent oral hygiene",
      "Avoid smoking during healing",
    ],
    faqs: [
      {
        question: "Are dental implants painful?",
        answer:
          "The procedure is performed under local anesthesia. Post-operative discomfort is typically manageable with over-the-counter pain medication and subsides within a few days.",
      },
      {
        question: "How long do implants last?",
        answer:
          "With proper care, dental implants can last a lifetime. Our AI monitoring system helps track implant health during regular check-ups.",
      },
      {
        question: "Am I a candidate for implants?",
        answer:
          "Most adults with good oral health are candidates. Our AI-powered assessment evaluates bone density, gum health, and medical history to determine suitability.",
      },
    ],
    priceRange: "₹25,000 – ₹55,000 per implant",
  },

  orthodontics: {
    title: "Orthodontics (Braces & Aligners)",
    description: "AI-powered orthodontic treatment with traditional braces or clear aligners.",
    overview:
      "Our orthodontic services combine traditional expertise with AI-powered treatment planning. Using 3D digital scanning and smart treatment simulation, we create personalized orthodontic plans that are more accurate and efficient. Whether you choose traditional braces or clear aligners, our system tracks progress and adjusts treatment for optimal results.",
    benefits: [
      "AI-optimized treatment duration",
      "3D digital scanning - no messy impressions",
      "Virtual treatment preview",
      "Progress tracking with AI monitoring",
      "Faster treatment with smart technology",
      "Comfortable, customized appliances",
    ],
    procedureSteps: [
      {
        title: "Digital Scan & Assessment",
        description: "3D intraoral scanning and AI analysis for precise treatment planning.",
      },
      {
        title: "Treatment Simulation",
        description: "AI generates step-by-step tooth movement simulation.",
      },
      {
        title: "Appliance Fitting",
        description: "Custom braces or clear aligner series delivered.",
      },
      {
        title: "Regular Monitoring",
        description: "AI-powered progress tracking with smart adjustments.",
      },
      {
        title: "Retention Phase",
        description: "Custom retainers and AI follow-up for lasting results.",
      },
    ],
    estimatedDuration: "6-24 months depending on case",
    recoveryGuidance: [
      "Mild discomfort for 2-3 days after adjustments",
      "Soft food diet initially",
      "Avoid hard, sticky, or sugary foods",
      "Clean aligners daily with provided solution",
      "Wear retainers as directed after treatment",
    ],
    faqs: [
      {
        question: "How long does orthodontic treatment take?",
        answer:
          "Treatment duration varies from 6-24 months. Our AI system provides an accurate estimate based on your specific case during the initial consultation.",
      },
      {
        question: "Are clear aligners as effective as braces?",
        answer:
          "For most cases, yes. Our AI assessment determines which option is best for your specific needs. Both provide excellent results when worn as directed.",
      },
      {
        question: "Do I need to wear retainers after treatment?",
        answer:
          "Yes, retainers are essential to maintain results. Our AI follow-up system sends reminders for retainer wear and replacement schedules.",
      },
    ],
    priceRange: "₹25,000 – ₹1,50,000",
  },

  "root-canal": {
    title: "Root Canal Treatment",
    description: "Pain-free root canal treatment with AI-assisted precision and advanced anesthesia.",
    overview:
      "Root canal treatment saves natural teeth that are severely infected or decayed. Using AI-assisted diagnosis and 3D imaging, we precisely locate and treat infected pulp tissue. Modern techniques and advanced anesthesia make the procedure comfortable, often with less discomfort than a routine filling.",
    benefits: [
      "Saves natural tooth from extraction",
      "AI-assisted precise canal location",
      "Virtually painless with modern anesthesia",
      "Single-visit treatment for most cases",
      "Prevents spread of infection",
      "Restores full chewing function",
    ],
    procedureSteps: [
      {
        title: "Digital Diagnosis",
        description: "AI analysis of X-rays and 3D scans to map canal anatomy.",
      },
      {
        title: "Anesthesia",
        description: "Advanced numbing techniques for complete comfort.",
      },
      {
        title: "Canal Cleaning",
        description: "Precise removal of infected pulp using AI-guided instruments.",
      },
      {
        title: "Canal Filling",
        description: "Sterile filling material placed to seal the canal.",
      },
      {
        title: "Crown Placement",
        description: "Protective crown restores strength and function.",
      },
    ],
    estimatedDuration: "1-2 visits, 60-90 minutes each",
    recoveryGuidance: [
      "Mild soreness for 2-3 days",
      "Avoid chewing on treated tooth until crown is placed",
      "Take prescribed or OTC pain medication as needed",
      "Continue regular brushing and flossing",
      "Complete crown placement within 2 weeks",
    ],
    faqs: [
      {
        question: "Is root canal painful?",
        answer:
          "Modern root canal treatment is no more uncomfortable than getting a filling. Local anesthesia ensures you're comfortable throughout the procedure.",
      },
      {
        question: "Can I go to work after a root canal?",
        answer:
          "Most patients return to normal activities the same day. Some prefer to take it easy for the rest of the day.",
      },
      {
        question: "How long does a root canal last?",
        answer:
          "With proper restoration and care, a root canal-treated tooth can last a lifetime. Regular check-ups help monitor the tooth's health.",
      },
    ],
    priceRange: "₹8,000 – ₹18,000",
  },

  "pediatric-dentistry": {
    title: "Pediatric Dentistry",
    description: "Gentle, child-friendly dental care with AI-powered education and monitoring.",
    overview:
      "Our pediatric dentistry program creates positive dental experiences for children from their first tooth through adolescence. Using kid-friendly language, animated AI education tools, and a gentle approach, we help children develop lifelong healthy oral hygiene habits. Our child-focused environment makes dental visits fun and anxiety-free.",
    benefits: [
      "Child-friendly environment",
      "AI-powered educational games",
      "Early detection of growth issues",
      "Preventive care focus",
      "Sedation options for anxious children",
      "Parent education and guidance",
    ],
    procedureSteps: [
      {
        title: "Welcome & Comfort Building",
        description: "Tour the office, meet the team, and get comfortable with the environment.",
      },
      {
        title: "Gentle Examination",
        description: "Fun, non-threatening check-up using child-friendly tools and language.",
      },
      {
        title: "AI Education",
        description: "Interactive games and animations teach proper brushing and flossing.",
      },
      {
        title: "Preventive Treatment",
        description: "Fluoride application, sealants, and cleaning as needed.",
      },
      {
        title: "Positive Reinforcement",
        description: "Rewards, certificates, and a fun experience to look forward to next time.",
      },
    ],
    estimatedDuration: "30-45 minutes per visit",
    recoveryGuidance: [
      "No special recovery needed for routine visits",
      "Soft foods if treatment was performed",
      "Praise and positive reinforcement for good cooperation",
      "Establish consistent brushing routine",
      "Limit sugary snacks and drinks",
    ],
    faqs: [
      {
        question: "When should my child first visit the dentist?",
        answer:
          "We recommend the first visit by age 1 or within 6 months of the first tooth appearing.",
      },
      {
        question: "How do you handle anxious children?",
        answer:
          "Our team is trained in pediatric behavior management. We offer sedation options and use a tell-show-do approach to build trust.",
      },
      {
        question: "Are dental X-rays safe for children?",
        answer:
          "Yes, our digital X-rays use up to 90% less radiation than traditional X-rays, and we use lead aprons for maximum protection.",
      },
    ],
    priceRange: "₹750 – ₹2,500",
  },

  "gum-treatment": {
    title: "Gum Treatment",
    description: "Advanced periodontal care with AI diagnostics for healthy gums.",
    overview:
      "Healthy gums are the foundation of a healthy smile. Our periodontal services use AI-powered diagnostics to detect gum disease at its earliest stages. From non-surgical scaling and root planing to advanced laser therapy, we provide comprehensive care to restore and maintain gum health.",
    benefits: [
      "AI early detection of gum disease",
      "Non-surgical treatment options",
      "Laser therapy for minimal discomfort",
      "Prevents tooth loss",
      "Improves overall health",
      "Customized home care plan",
    ],
    procedureSteps: [
      {
        title: "Periodontal Assessment",
        description: "AI analysis of gum pockets, bone levels, and inflammation markers.",
      },
      {
        title: "Deep Cleaning",
        description: "Scaling and root planing to remove plaque and tartar below gumline.",
      },
      {
        title: "Laser Therapy (if needed)",
        description: "Minimally invasive laser treatment for advanced cases.",
      },
      {
        title: "Medication",
        description: "Antibacterial rinses or localized antibiotics as needed.",
      },
      {
        title: "Maintenance Program",
        description: "Regular periodontal maintenance with AI monitoring.",
      },
    ],
    estimatedDuration: "1-4 visits depending on severity",
    recoveryGuidance: [
      "Mild sensitivity for 2-3 days",
      "Salt water rinses as directed",
      "Soft food diet for a few days",
      "Avoid flossing treated areas for 24 hours",
      "Use prescribed mouth rinse",
      "Attend regular maintenance visits",
    ],
    faqs: [
      {
        question: "What causes gum disease?",
        answer:
          "Gum disease is caused by plaque buildup. Risk factors include poor oral hygiene, smoking, diabetes, genetics, and certain medications.",
      },
      {
        question: "Is gum disease reversible?",
        answer:
          "Early stage (gingivitis) is reversible with professional treatment and good home care. Advanced periodontitis can be managed but not cured.",
      },
      {
        question: "How do I know if I have gum disease?",
        answer:
          "Symptoms include bleeding gums, bad breath, receding gums, loose teeth, and red or swollen gums. Our AI screening can detect it before symptoms appear.",
      },
    ],
    priceRange: "₹1,500 – ₹25,000",
  },

  "wisdom-tooth": {
    title: "Wisdom Tooth Extraction",
    description: "Safe, comfortable wisdom tooth removal with AI-guided surgical planning.",
    overview:
      "Wisdom tooth extraction is a common procedure to prevent overcrowding, infection, and other dental issues. Using AI-guided 3D imaging and surgical planning, we precisely assess tooth position, nerve proximity, and optimal extraction approach. Our advanced anesthesia and sedation options ensure a comfortable experience.",
    benefits: [
      "AI-guided surgical planning",
      "3D imaging for nerve safety",
      "Multiple sedation options",
      "Prevents future dental problems",
      "Fast recovery with smart follow-up",
      "Minimal post-operative discomfort",
    ],
    procedureSteps: [
      {
        title: "3D Assessment",
        description: "AI analysis of CBCT scan to plan safe extraction approach.",
      },
      {
        title: "Anesthesia Administration",
        description: "Local anesthesia with optional sedation for complete comfort.",
      },
      {
        title: "Extraction",
        description: "Precise, minimally invasive removal using AI-guided techniques.",
      },
      {
        title: "Site Closure",
        description: "Stitches placed if needed to promote healing.",
      },
      {
        title: "Recovery Monitoring",
        description: "AI-powered follow-up with personalized aftercare instructions.",
      },
    ],
    estimatedDuration: "45-90 minutes per tooth",
    recoveryGuidance: [
      "Rest for 24-48 hours after procedure",
      "Apply ice packs to reduce swelling",
      "Avoid using straws for 1 week",
      "Soft food diet for 3-5 days",
      "No vigorous rinsing or spitting for 24 hours",
      "Take prescribed medications as directed",
    ],
    faqs: [
      {
        question: "Is wisdom tooth removal painful?",
        answer:
          "The procedure is performed under anesthesia so you won't feel pain. Post-operative discomfort is manageable with prescribed medication and typically peaks at 2-3 days.",
      },
      {
        question: "When should wisdom teeth be removed?",
        answer:
          "Most dentists recommend removal between ages 17-25, before the roots are fully developed and before they cause problems.",
      },
      {
        question: "How long does recovery take?",
        answer:
          "Most patients return to normal activities within 3-5 days. Complete healing of the extraction site takes 2-4 weeks.",
      },
    ],
    priceRange: "₹2,500 – ₹12,000 per tooth",
  },

  "crowns-bridges": {
    title: "Crowns & Bridges",
    description: "Custom-crafted crowns and bridges with AI-optimized design for perfect fit.",
    overview:
      "Crowns and bridges restore damaged or missing teeth to full function and aesthetics. Using AI-powered digital design and same-day CAD/CAM technology, we create precision-fitted restorations in a fraction of the traditional time. Our materials include porcelain, ceramic, zirconia, and gold options to match your needs.",
    benefits: [
      "AI-optimized design for perfect fit",
      "Same-day restorations with CEREC technology",
      "Natural-looking, tooth-colored materials",
      "Durable and long-lasting",
      "Single-visit option for most cases",
      "Strengthens weakened teeth",
    ],
    procedureSteps: [
      {
        title: "Digital Impression",
        description: "Intraoral scanning for precise 3D model - no messy impressions.",
      },
      {
        title: "AI Design",
        description: "Computer-assisted design for optimal fit, bite, and aesthetics.",
      },
      {
        title: "Tooth Preparation",
        description: "Minimal tooth reduction using precision guides.",
      },
      {
        title: "Restoration Fabrication",
        description: "Same-day milling or custom lab fabrication.",
      },
      {
        title: "Placement & Adjustment",
        description: "Precision placement with bite verification and final adjustments.",
      },
    ],
    estimatedDuration: "1-2 visits",
    recoveryGuidance: [
      "Avoid sticky foods for 24 hours",
      "Mild sensitivity to temperature for a few days",
      "Maintain good oral hygiene around restoration",
      "Use non-abrasive toothpaste",
      "Attend regular check-ups",
    ],
    faqs: [
      {
        question: "How long do crowns and bridges last?",
        answer:
          "With proper care, crowns and bridges can last 10-15 years or longer. Our AI monitoring helps detect issues early during routine check-ups.",
      },
      {
        question: "Are same-day crowns as good as lab-made?",
        answer:
          "Yes, modern CAD/CAM technology produces crowns that are equal or superior to lab-made ones, with the benefit of completion in a single visit.",
      },
      {
        question: "Will my crown look natural?",
        answer:
          "Our AI design system matches the shape, color, and translucency of your natural teeth for seamless results.",
      },
    ],
    priceRange: "₹6,000 – ₹18,000 per unit",
  },

  veneers: {
    title: "Veneers",
    description: "Ultra-thin, custom porcelain veneers designed with AI for flawless smiles.",
    overview:
      "Porcelain veneers are thin, custom-made shells that cover the front surface of teeth to correct imperfections. Our AI-powered smile design system creates your ideal smile, showing you a preview before any treatment begins. With minimal tooth preparation and natural-looking results, veneers are the premier choice for smile enhancement.",
    benefits: [
      "AI smile preview before treatment",
      "Ultra-thin, minimal preparation",
      "Natural-looking translucency",
      "Stain-resistant surface",
      "Corrects multiple imperfections",
      "Long-lasting results",
    ],
    procedureSteps: [
      {
        title: "Smile Consultation & AI Design",
        description: "Discuss goals and view AI-generated preview of your new smile.",
      },
      {
        title: "Minimal Preparation",
        description: "Ultra-thin veneers require little to no tooth reduction.",
      },
      {
        title: "Digital Impression",
        description: "Precise 3D scan for custom veneer fabrication.",
      },
      {
        title: "Temporary Veneers",
        description: "Try-in temporaries to test your new smile.",
      },
      {
        title: "Final Placement",
        description: "Bonding of custom-crafted porcelain veneers.",
      },
    ],
    estimatedDuration: "2-3 visits over 2-3 weeks",
    recoveryGuidance: [
      "Minor sensitivity for 1-2 days",
      "Avoid staining foods for 48 hours",
      "Use non-abrasive toothpaste",
      "Wear night guard if you grind teeth",
      "Regular check-ups and cleanings",
    ],
    faqs: [
      {
        question: "How long do veneers last?",
        answer:
          "With proper care, porcelain veneers last 10-15 years. They are stain-resistant and maintain their appearance with regular maintenance.",
      },
      {
        question: "Do veneers damage your teeth?",
        answer:
          "Modern ultra-thin veneers require minimal to no tooth reduction. Our AI design system minimizes preparation while maximizing aesthetics.",
      },
      {
        question: "Can I get just one veneer?",
        answer:
          "Yes, single veneers are common for chipped or discolored teeth. Our AI system ensures the shade and shape match your natural teeth perfectly.",
      },
    ],
    priceRange: "₹8,000 – ₹25,000 per veneer",
  },

  dentures: {
    title: "Dentures",
    description: "Modern, comfortable dentures with AI-optimized fit and natural aesthetics.",
    overview:
      "Our denture services combine traditional craftsmanship with AI-powered design for optimal fit, comfort, and natural appearance. From partial dentures that replace a few teeth to complete dentures for full arch restoration, we use digital scanning and precision fabrication for results that look and feel natural.",
    benefits: [
      "AI-optimized fit and comfort",
      "Digital scanning for precision",
      "Natural-looking aesthetics",
      "Improved speech and chewing",
      "Support for facial structure",
      "Implant-retained options available",
    ],
    procedureSteps: [
      {
        title: "Comprehensive Assessment",
        description: "Digital scans, bite analysis, and AI-optimized design planning.",
      },
      {
        title: "Digital Impression",
        description: "Precise intraoral scanning for perfect fit.",
      },
      {
        title: "Try-In Appointment",
        description: "Preview and adjust fit, color, and shape before final fabrication.",
      },
      {
        title: "Final Delivery",
        description: "Precision-fit denture placement with comfort adjustments.",
      },
      {
        title: "Follow-Up Care",
        description: "AI-monitored adjustments and maintenance schedule.",
      },
    ],
    estimatedDuration: "4-6 visits over 3-5 weeks",
    recoveryGuidance: [
      "Practice speaking - read aloud",
      "Start with soft foods, gradually progress",
      "Clean dentures daily with proper solutions",
      "Remove at night for tissue healing",
      "Attend follow-up for adjustments",
      "Use adhesive as recommended",
    ],
    faqs: [
      {
        question: "Will dentures look natural?",
        answer:
          "Modern dentures are designed to look very natural. Our AI system helps select tooth shape, size, and color that complement your facial features.",
      },
      {
        question: "How long does it take to get used to dentures?",
        answer:
          "Most patients adapt within 2-4 weeks. Eating and speaking may feel different initially, but our AI follow-up system provides personalized tips.",
      },
      {
        question: "Can I sleep with my dentures in?",
        answer:
          "It's recommended to remove dentures at night to allow gum tissue to rest and maintain oral health.",
      },
    ],
    priceRange: "₹8,000 – ₹35,000 per arch",
  },

  "smile-makeovers": {
    title: "Smile Makeovers",
    description: "Complete smile transformation with AI-powered design and multi-procedure planning.",
    overview:
      "A smile makeover is a comprehensive approach to completely transforming your smile. Our AI-powered platform analyzes your facial features, tooth proportions, gum line, and smile dynamics to design your ideal smile. Combining multiple cosmetic and restorative procedures, we create a personalized treatment plan that delivers stunning, natural-looking results.",
    benefits: [
      "AI-powered complete smile design",
      "Personalized multi-procedure plan",
      "Preview results before starting",
      "Coordinated treatment timeline",
      "Combined procedures for efficiency",
      "Transformational, long-lasting results",
    ],
    procedureSteps: [
      {
        title: "Comprehensive Smile Analysis",
        description: "AI facial analysis, digital scanning, and smile design consultation.",
      },
      {
        title: "Digital Smile Design",
        description: "View your potential new smile with AI-generated preview.",
      },
      {
        title: "Custom Treatment Plan",
        description: "Multi-stage plan combining procedures for optimal results.",
      },
      {
        title: "Treatment Phase",
        description: "Coordinated procedures in logical sequence.",
      },
      {
        title: "Final Reveal",
        description: "Completed smile transformation with aftercare guidance.",
      },
    ],
    estimatedDuration: "2-6 months depending on procedures",
    recoveryGuidance: [
      "Follow specific aftercare for each procedure",
      "Attend scheduled follow-ups",
      "Wear any prescribed appliances",
      "Maintain excellent oral hygiene",
      "Use provided care products",
      "Schedule regular maintenance visits",
    ],
    faqs: [
      {
        question: "What procedures are included in a smile makeover?",
        answer:
          "A smile makeover can include veneers, crowns, teeth whitening, orthodontics, gum reshaping, implants, and bonding. Your plan is customized to your specific needs and goals.",
      },
      {
        question: "How much does a smile makeover cost?",
        answer:
          "Costs vary widely based on procedures needed, typically ranging from ₹75,000 to ₹3,00,000+. We provide detailed cost estimates and offer payment plans.",
      },
      {
        question: "Can I see the expected results?",
        answer:
          "Yes! Our AI smile simulation shows you the anticipated results before any treatment begins, allowing you to provide input and make informed decisions.",
      },
    ],
    priceRange: "₹75,000 – ₹3,00,000+",
  },
};
