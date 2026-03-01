import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, RotateCcw, ArrowRight, Trash2,
    CornerDownRight, X, ChevronLeft, ChevronRight,
    Search, Anchor, Zap, Box, MousePointer2,
    GitCommit, ChevronsRight, Cpu, Layers, Terminal, Activity
} from 'lucide-react';

// --- TYPES ---
type ListType = 'singly' | 'doubly';
type NodeData = {
    id: string;
    value: number;
    isNew?: boolean;
    isDeleting?: boolean;
    highlight?: boolean;
};

type CodeLine = { id: string; text: string; explanation: string; active: boolean };
type VariableState = { name: string; value: string; color: string };
type Frame = {
    nodes: NodeData[];
    phantom: NodeData | null;
    seekerIndex: number | null;
    message: string;
    codeLines: CodeLine[];
    variables: VariableState[];
};

// --- ADVANCED ALGORITHM MATRIX ---
const SNIPPETS = {
    singly: {
        insertHead: [
            { id: '1', text: 'Node temp = new Node(val);', explanation: 'Allocating memory for a new node in the Heap.', active: false },
            { id: '2', text: 'temp.next = head;', explanation: 'Pointing the new node to the current Head of the list.', active: false },
            { id: '3', text: 'head = temp;', explanation: 'Updating the Head pointer to reference our new node.', active: false },
        ],
        insertIndex: [
            { id: '1', text: 'Node temp = new Node(val);', explanation: 'Creating the new node to be inserted.', active: false },
            { id: '2', text: 'Node ptr = head;', explanation: 'Initializing a traversal pointer (ptr) at the start.', active: false },
            { id: '3', text: 'while(i < index-1) ptr = ptr.next;', explanation: 'Advancing ptr to the node BEFORE the insertion point.', active: false },
            { id: '4', text: 'temp.next = ptr.next;', explanation: 'Connecting new node to the rest of the chain.', active: false },
            { id: '5', text: 'ptr.next = temp;', explanation: 'Linking the previous node to our new node.', active: false },
        ],
        deleteHead: [
            { id: '1', text: 'if (head == null) return;', explanation: 'Checking if the list is empty (Underflow protection).', active: false },
            { id: '2', text: 'Node junk = head;', explanation: 'Storing the current head to free its memory later.', active: false },
            { id: '3', text: 'head = head.next;', explanation: 'Moving the Head pointer to the second node.', active: false },
            { id: '4', text: 'delete junk;', explanation: 'Deallocating the memory of the removed node.', active: false },
        ],
        deleteIndex: [
            { id: '1', text: 'Node ptr = head;', explanation: 'Starting traversal from Head.', active: false },
            { id: '2', text: 'while(i < index-1) ptr = ptr.next;', explanation: 'Navigating to the predecessor of the target node.', active: false },
            { id: '3', text: 'Node junk = ptr.next;', explanation: 'Identifying the node to be deleted.', active: false },
            { id: '4', text: 'ptr.next = junk.next;', explanation: 'Bypassing the junk node (changing the link).', active: false },
            { id: '5', text: 'delete junk;', explanation: 'Freeing the memory of the deleted node.', active: false },
        ]
    },
    doubly: {
        insertHead: [
            { id: '1', text: 'Node temp = new Node(val);', explanation: 'Allocating memory for new Doubly Node.', active: false },
            { id: '2', text: 'temp.next = head;', explanation: 'Setting forward pointer to current Head.', active: false },
            { id: '3', text: 'if(head != null) head.prev = temp;', explanation: 'Updating back-pointer of old Head.', active: false },
            { id: '4', text: 'head = temp;', explanation: 'Moving Head pointer to the new node.', active: false },
        ],
        insertIndex: [
            { id: '1', text: 'Node temp = new Node(val);', explanation: 'Creating new Doubly Node.', active: false },
            { id: '2', text: 'Node ptr = head;', explanation: 'Initializing traversal.', active: false },
            { id: '3', text: 'while(i < index-1) ptr = ptr.next;', explanation: 'Moving to the insertion point.', active: false },
            { id: '4', text: 'temp.next = ptr.next;', explanation: 'Linking forward to the next node.', active: false },
            { id: '5', text: 'if(ptr.next) ptr.next.prev = temp;', explanation: 'Linking backward from the next node.', active: false },
            { id: '6', text: 'ptr.next = temp; temp.prev = ptr;', explanation: 'Linking previous node to new node (both ways).', active: false },
        ],
        deleteHead: [
            { id: '1', text: 'Node junk = head;', explanation: 'Marking Head for deletion.', active: false },
            { id: '2', text: 'head = head.next;', explanation: 'Shifting Head forward.', active: false },
            { id: '3', text: 'if(head) head.prev = null;', explanation: 'Severing the backward link of the new Head.', active: false },
            { id: '4', text: 'delete junk;', explanation: 'Deallocating memory.', active: false },
        ],
        deleteIndex: [
            { id: '1', text: 'Node ptr = head;', explanation: 'Starting traversal.', active: false },
            { id: '2', text: 'while(i < index-1) ptr = ptr.next;', explanation: 'Finding predecessor node.', active: false },
            { id: '3', text: 'Node junk = ptr.next;', explanation: 'Targeting node for deletion.', active: false },
            { id: '4', text: 'ptr.next = junk.next;', explanation: 'Linking forward around junk.', active: false },
            { id: '5', text: 'if(junk.next) junk.next.prev = ptr;', explanation: 'Linking backward around junk.', active: false },
            { id: '6', text: 'delete junk;', explanation: 'Freeing memory.', active: false },
        ]
    }
};

// --- BACKGROUND COMPONENT ---
const CyberGrid = () => (
    <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#020205]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.05),transparent_70%)]" />
    </div>
);

const LinkedListVisualizer = () => {

    const [listType, setListType] = useState<ListType>('singly');
    const [nodes, setNodes] = useState<NodeData[]>([
        { id: 'A1', value: 10 }, { id: 'B2', value: 20 }, { id: 'C3', value: 30 }
    ]);

    const [inputValue, setInputValue] = useState<number>(45);
    const [inputIndex, setInputIndex] = useState<number>(1);

    const [timeline, setTimeline] = useState<Frame[]>([]);
    const [currentStep, setCurrentStep] = useState<number>(-1);
    const isSimulating = currentStep >= 0 && currentStep < timeline.length;

    const currentFrame = isSimulating ? timeline[currentStep] : {
        nodes, phantom: null, seekerIndex: null, message: 'SYSTEM_IDLE', codeLines: [], variables: []
    };
    const { nodes: renderNodes, phantom, seekerIndex, message, codeLines, variables } = currentFrame;

    useEffect(() => { generateRandom(); }, []);
    const generateRandom = () => setInputValue(Math.floor(Math.random() * 90) + 10);

    const handleNext = () => {
        if (currentStep < timeline.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setNodes(timeline[currentStep].nodes.map(n => ({ ...n, isNew: false, isDeleting: false })));
            setCurrentStep(-1);
            setTimeline([]);
            generateRandom();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };


    const generateInsertFrames = (atHead: boolean) => {
        const newFrames: Frame[] = [];
        let currentNodes = [...nodes];
        let currentPhantom: NodeData | null = null;
        let currentSeeker: number | null = null;

        const pushFrame = (lineId: string, snippet: CodeLine[], vars: VariableState[]) => {
            const currentLine = snippet.find(l => l.id === lineId);
            const freezeNodes = currentNodes.map(n => ({ ...n }));
            const freezePhantom = currentPhantom ? { ...currentPhantom } : null;
            newFrames.push({
                nodes: freezeNodes,
                phantom: freezePhantom,
                seekerIndex: currentSeeker,
                message: currentLine ? currentLine.explanation : 'Processing...',
                codeLines: snippet.map(line => ({ ...line, active: line.id === lineId })),
                variables: vars
            });
        };

        const idx = atHead ? 0 : Math.max(0, Math.min(inputIndex, currentNodes.length));
        const currentSnippets = listType === 'singly' ? SNIPPETS.singly : SNIPPETS.doubly;
        const snippet = idx === 0 ? currentSnippets.insertHead : currentSnippets.insertIndex;

        const newNodeId = Math.floor(Math.random() * 9000 + 1000).toString();
        const newNode = { id: newNodeId, value: inputValue, isNew: true };

        // 1. ALLOCATE
        currentPhantom = newNode;
        pushFrame('1', snippet, [{ name: 'temp', value: newNode.value.toString(), color: '#00f5ff' }]);

        if (idx === 0) {
            pushFrame('2', snippet, [{ name: 'temp', value: newNode.value.toString(), color: '#00f5ff' }]);
            if (listType === 'doubly') pushFrame('3', snippet, [{ name: 'temp', value: newNode.value.toString(), color: '#00f5ff' }]);
            pushFrame(listType === 'doubly' ? '4' : '3', snippet, [{ name: 'head', value: newNode.id, color: '#fbbf24' }]);
        } else {
            pushFrame('2', snippet, [{ name: 'ptr', value: 'HEAD', color: '#00ff88' }]);
            currentSeeker = 0;

            for (let i = 0; i < idx - 1; i++) {
                pushFrame('3', snippet, [
                    { name: 'ptr', value: currentNodes[i + 1]?.id || 'NULL', color: '#00ff88' },
                    { name: 'i', value: i.toString(), color: '#94a3b8' }
                ]);
                currentSeeker = i + 1;
            }

            pushFrame('4', snippet, [{ name: 'ptr', value: currentNodes[currentSeeker]?.id || 'NULL', color: '#00ff88' }]);
            pushFrame('5', snippet, [{ name: 'ptr', value: currentNodes[currentSeeker]?.id || 'NULL', color: '#00ff88' }]);
            if (listType === 'doubly') pushFrame('6', snippet, [{ name: 'ptr', value: currentNodes[currentSeeker]?.id || 'NULL', color: '#00ff88' }]);
        }

        currentNodes.splice(idx, 0, newNode);
        currentPhantom = null;
        currentSeeker = null;

        newFrames.push({
            nodes: currentNodes.map(n => ({ ...n })),
            phantom: null, seekerIndex: null,
            message: 'MEMORY_UPDATED_SUCCESSFULLY', codeLines: [], variables: []
        });

        const finalNodes = currentNodes.map(n => ({ ...n, isNew: false }));
        newFrames.push({
            nodes: finalNodes.map(n => ({ ...n })),
            phantom: null, seekerIndex: null,
            message: 'SYSTEM_IDLE', codeLines: [], variables: []
        });

        return newFrames;
    };

    const generateDeleteFrames = (atHead: boolean) => {
        const newFrames: Frame[] = [];
        let currentNodes = [...nodes];
        if (currentNodes.length === 0) return [];
        let currentSeeker: number | null = null;

        const pushFrame = (lineId: string, snippet: CodeLine[], vars: VariableState[]) => {
            const freezeNodes = currentNodes.map(n => ({ ...n }));
            newFrames.push({
                nodes: freezeNodes,
                phantom: null, seekerIndex: currentSeeker,
                message: currentLine ? currentLine.explanation : 'Processing...',
                codeLines: snippet.map(line => ({ ...line, active: line.id === lineId })),
                variables: vars
            });
        };

        const idx = atHead ? 0 : Math.max(0, Math.min(inputIndex, currentNodes.length - 1));
        const currentSnippets = listType === 'singly' ? SNIPPETS.singly : SNIPPETS.doubly;
        const snippet = idx === 0 ? currentSnippets.deleteHead : currentSnippets.deleteIndex;

        if (idx === 0) {
            if (listType === 'singly') {
                pushFrame('1', snippet, []);
                currentNodes[0] = { ...currentNodes[0], isDeleting: true };
                pushFrame('2', snippet, [{ name: 'junk', value: currentNodes[0].id, color: '#ef4444' }]);
                pushFrame('3', snippet, [{ name: 'head', value: currentNodes[1]?.id || 'NULL', color: '#fbbf24' }]);
                pushFrame('4', snippet, []);
            } else {
                currentNodes[0] = { ...currentNodes[0], isDeleting: true };
                pushFrame('1', snippet, [{ name: 'junk', value: currentNodes[0].id, color: '#ef4444' }]);
                pushFrame('2', snippet, [{ name: 'head', value: currentNodes[1]?.id || 'NULL', color: '#fbbf24' }]);
                pushFrame('3', snippet, []);
                pushFrame('4', snippet, []);
            }
        } else {
            pushFrame('1', snippet, [{ name: 'ptr', value: 'HEAD', color: '#00ff88' }]);
            currentSeeker = 0;
            for (let i = 0; i < idx - 1; i++) {
                pushFrame('2', snippet, [
                    { name: 'ptr', value: currentNodes[i + 1]?.id || 'NULL', color: '#00ff88' },
                    { name: 'i', value: i.toString(), color: '#94a3b8' }
                ]);
                currentSeeker = i + 1;
            }
            currentNodes[idx] = { ...currentNodes[idx], isDeleting: true };
            pushFrame('3', snippet, [{ name: 'junk', value: currentNodes[idx].id, color: '#ef4444' }]);
            pushFrame('4', snippet, []);
            pushFrame('5', snippet, []);
            if (listType === 'doubly') pushFrame('6', snippet, []);
        }

        currentNodes.splice(idx, 1);
        currentSeeker = null;

        newFrames.push({
            nodes: currentNodes.map(n => ({ ...n })), phantom: null, seekerIndex: null,
            message: 'MEMORY_FREED', codeLines: [], variables: []
        });
        newFrames.push({
            nodes: currentNodes.map(n => ({ ...n })), phantom: null, seekerIndex: null,
            message: 'SYSTEM_IDLE', codeLines: [], variables: []
        });

        return newFrames;
    };

    const handleInsert = (atHead: boolean) => {
        if (isSimulating) return;
        setTimeline(generateInsertFrames(atHead));
        setCurrentStep(0);
    };

    const handleDelete = (atHead: boolean) => {
        if (isSimulating || renderNodes.length === 0) return;
        setTimeline(generateDeleteFrames(atHead));
        setCurrentStep(0);
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#020205] overflow-hidden font-sans text-white">
            <CyberGrid />

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">

                {/* --- LEFT: COMMAND CENTER --- */}
                <div className="w-full lg:w-96 bg-[#0a0a14]/90 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col shadow-2xl h-[45%] lg:h-full shrink-0">

                    {/* Header */}
                    <div className="hidden lg:block p-6 border-b border-white/5 bg-gradient-to-r from-[#00f5ff]/5 to-transparent">
                        <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-2">
                            <Cpu className="text-[#00f5ff]" /> LINKED_LIST_OS
                        </h2>
                        <p className="text-[10px] text-[#00f5ff]/60 font-mono mt-1">MEMORY VISUALIZATION KERNEL v4.1</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 lg:p-6 space-y-1.5 lg:space-y-8 custom-scrollbar">

                        {/* 1. Mode Selection */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Architecture</label>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                {(['singly', 'doubly'] as ListType[]).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => { setListType(type); setNodes([{ id: 'A1', value: 10 }, { id: 'B2', value: 20 }]); setCurrentStep(-1); setTimeline([]); }}
                                        disabled={isSimulating}
                                        className={`flex-1 py-1.5 lg:py-2 rounded-lg text-[10px] font-black uppercase transition-all duration-300 ${listType === type ? 'bg-[#00f5ff] text-black shadow-lg shadow-[#00f5ff]/20' : 'text-gray-500 hover:text-white'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Playback Controls */}
                        <div className="bg-white/[0.03] p-2 lg:p-4 rounded-xl lg:rounded-2xl border border-white/5 space-y-1.5 lg:space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Process Control</span>
                                <div className={`px-2 py-0.5 rounded text-[9px] font-black border ${isSimulating ? 'border-[#00f5ff] text-[#00f5ff]' : 'border-gray-500 text-gray-500'}`}>
                                    {isSimulating ? `STEP ${currentStep + 1}/${timeline.length}` : 'IDLE'}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleBack}
                                    disabled={!isSimulating || currentStep === 0}
                                    className="flex-1 py-2 lg:py-3 justify-center rounded-xl flex items-center gap-1.5 lg:gap-2 transition-all font-bold text-[11px] border bg-black/50 border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> BACK
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!isSimulating}
                                    className="flex-1 py-2 lg:py-3 bg-[#00f5ff] text-black rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 lg:gap-2 font-black text-[11px] hover:shadow-[0_0_15px_#00f5ff]"
                                >
                                    {currentStep === timeline.length - 1 ? 'FINISH' : 'NEXT'} <ChevronRight size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                </button>
                            </div>
                        </div>

                        {/* 3. Operations Deck */}
                        <div className="space-y-1.5 lg:space-y-4">
                            <div className="grid grid-cols-2 gap-2 lg:gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Payload (Val)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(parseInt(e.target.value) || 0)}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 lg:px-4 lg:py-3 text-xs lg:text-sm text-[#00f5ff] focus:border-[#00f5ff] outline-none font-mono"
                                        />
                                        <button onClick={generateRandom} className="px-3 py-1.5 lg:p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-gray-400">
                                            <RotateCcw size={14} className="w-3.5 h-3.5 lg:w-5 lg:h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Address (Idx)</label>
                                    <input
                                        type="number"
                                        value={inputIndex}
                                        onChange={(e) => setInputIndex(parseInt(e.target.value) || 0)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 lg:px-4 lg:py-3 text-xs lg:text-sm text-[#00f5ff] focus:border-[#00f5ff] outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 lg:gap-3">
                                <button onClick={() => handleInsert(true)} disabled={isSimulating} className="p-2 lg:p-4 bg-[#00f5ff]/5 border border-[#00f5ff]/20 hover:border-[#00f5ff]/50 hover:bg-[#00f5ff]/10 rounded-xl text-[#00f5ff] transition-all flex flex-col items-center gap-1 lg:gap-2 disabled:opacity-30 group">
                                    <CornerDownRight size={14} className="lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase">Push Head</span>
                                </button>
                                <button onClick={() => handleInsert(false)} disabled={isSimulating} className="p-2 lg:p-4 bg-[#00f5ff]/5 border border-[#00f5ff]/20 hover:border-[#00f5ff]/50 hover:bg-[#00f5ff]/10 rounded-xl text-[#00f5ff] transition-all flex flex-col items-center gap-1 lg:gap-2 disabled:opacity-30 group">
                                    <Plus size={14} className="lg:w-5 lg:h-5 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase">Insert At</span>
                                </button>
                                <button onClick={() => handleDelete(true)} disabled={isSimulating} className="p-2 lg:p-4 bg-red-500/5 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl text-red-500 transition-all flex flex-col items-center gap-1 lg:gap-2 disabled:opacity-30 group">
                                    <X size={14} className="lg:w-5 lg:h-5 group-hover:rotate-90 transition-transform" />
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase">Pop Head</span>
                                </button>
                                <button onClick={() => handleDelete(false)} disabled={isSimulating} className="p-2 lg:p-4 bg-red-500/5 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl text-red-500 transition-all flex flex-col items-center gap-1 lg:gap-2 disabled:opacity-30 group">
                                    <Trash2 size={14} className="lg:w-5 lg:h-5 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase">Delete At</span>
                                </button>
                            </div>

                            <button onClick={() => { setNodes([]); setCurrentStep(-1); setTimeline([]); }} className="w-full py-2 lg:py-3 border border-white/5 hover:border-white/20 rounded-xl text-[10px] font-bold text-gray-500 hover:text-white transition-all flex items-center justify-center gap-1.5 lg:gap-2">
                                <RotateCcw size={12} className="w-3.5 h-3.5" /> FORMAT_MEMORY
                            </button>
                        </div>

                    </div>
                </div>

                {/* --- RIGHT: HOLOGRAPHIC CANVAS --- */}
                <div className="flex-1 relative flex flex-col min-h-[50vh] lg:min-h-0 overflow-auto overflow-x-hidden custom-scrollbar">

                    {/* 1. Floating Execution Trace (Top Right) - HIDDEN ON MOBILE */}
                    <motion.div
                        drag
                        dragMomentum={false}
                        className="hidden lg:block absolute top-4 right-4 z-50 w-[400px] pointer-events-auto cursor-move"
                    >
                        <div className="bg-[#050508]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col max-h-[35vh] lg:max-h-[50vh]">
                            <div className="px-2 py-1.5 lg:px-4 lg:py-3 bg-white/5 border-b border-white/10 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-1.5 lg:gap-2 text-white">
                                    <Terminal size={12} className="lg:w-3.5 lg:h-3.5 text-[#00f5ff]" />
                                    <span className="text-[8px] lg:text-xs font-black uppercase tracking-widest">Execution_Trace</span>
                                </div>
                            </div>

                            {variables.length > 0 && (
                                <div className="px-2 py-1.5 lg:px-4 lg:py-3 border-b border-white/5 bg-[#00f5ff]/5 flex flex-wrap gap-2 lg:gap-3 shrink-0">
                                    {variables.map((v, i) => (
                                        <div key={i} className="text-[8px] lg:text-xs font-mono">
                                            <span className="text-gray-400">{v.name}:</span>{' '}
                                            <span style={{ color: v.color }} className="font-bold">{v.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="p-2 lg:p-4 space-y-1 lg:space-y-2 overflow-y-auto custom-scrollbar">
                                {codeLines.length > 0 ? codeLines.map((line) => (
                                    <div key={line.id} className={`text-[8px] lg:text-xs font-mono flex gap-2 lg:gap-4 transition-colors duration-300 ${line.active ? 'text-white' : 'text-gray-600 opacity-50'}`}>
                                        <span className="shrink-0 w-3 lg:w-6 text-right opacity-30">{line.id}</span>
                                        <span className={line.active ? 'font-bold text-[#00f5ff]' : ''}>{line.text}</span>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-gray-700 gap-2">
                                        <Zap size={16} className="opacity-20" />
                                        <span className="text-[10px] font-mono italic">AWAITING_OPCODE</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. Mobile Execution Trace (Bottom Fixed) - HIDDEN ON DESKTOP */}
                    <div className="lg:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-[94%] pb-safe">
                        <motion.div
                            key={codeLines.find(l => l.active)?.text || message}
                            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            className="px-4 py-3 bg-[#0a0a14]/95 backdrop-blur-md border border-[#00f5ff]/30 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] flex items-center gap-3 w-full"
                        >
                            <div className={`p-2 rounded-xl shrink-0 ${isSimulating ? 'bg-[#00f5ff]/10 text-[#00f5ff] animate-pulse shadow-[0_0_15px_#00f5ff]' : 'bg-gray-800 text-gray-500'}`}>
                                <Terminal size={16} />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[9px] text-[#00f5ff] font-bold uppercase tracking-widest truncate mb-0.5">Execution_Trace</span>
                                <span className="text-xs font-mono font-medium text-white truncate">
                                    {codeLines.find(l => l.active)?.text || message}
                                </span>
                            </div>
                        </motion.div>
                    </div>

                    {/* 3. The Main Stage */}
                    <div className="flex-1 relative flex flex-col w-full h-full">

                        {/* Memory Pool (Creation Zone) */}
                        <div className="h-1/4 lg:h-1/3 min-h-[80px] lg:min-h-[150px] w-full border-b border-white/5 bg-white/[0.01] relative flex items-center justify-center shrink-0">
                            <div className="absolute top-2 lg:top-4 left-2 lg:left-6 flex items-center gap-1.5 lg:gap-2 text-[8px] lg:text-[10px] font-mono text-gray-500 uppercase tracking-widest z-10">
                                <Box className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-[#00f5ff]" />
                                <span>Heap_Allocator</span>
                            </div>

                            <AnimatePresence>
                                {phantom && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ y: 200, opacity: 0, scale: 0.5, transition: { duration: 0.5 } }}
                                        className="relative flex flex-col items-center"
                                    >
                                        <div className="px-2 py-0.5 lg:px-3 lg:py-1 bg-[#00f5ff] text-black text-[7px] lg:text-[9px] font-black rounded-full mb-2 lg:mb-3 shadow-[0_0_20px_#00f5ff]">NEW_NODE</div>
                                        <div className="w-12 h-12 lg:w-24 lg:h-24 rounded-lg lg:rounded-2xl bg-[#0a0a14] border-2 border-[#00f5ff] flex items-center justify-center shadow-[0_0_50px_rgba(0,245,255,0.2)]">
                                            <span className="text-lg lg:text-3xl font-black text-white">{phantom.value}</span>
                                            <div className="absolute top-1 lg:top-2 left-1 lg:left-3 text-[6px] lg:text-[9px] font-mono text-gray-500">0x{phantom.id}</div>
                                        </div>
                                        <motion.div
                                            animate={{ y: [0, 10, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className="absolute -bottom-6 lg:-bottom-10 text-[#00f5ff]"
                                        >
                                            <ArrowRight size={24} className="rotate-90" />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Linked List Chain */}
                        <div className="flex-1 flex items-center overflow-x-auto px-4 lg:px-20 pb-20 lg:pb-0 custom-scrollbar relative">

                            {/* HEAD Anchor */}
                            <div className="relative mr-4 lg:mr-16 flex flex-col items-center gap-1.5 lg:gap-3 group shrink-0">
                                <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-full bg-yellow-500/10 border-2 border-yellow-500 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.3)] relative z-10">
                                    <Anchor className="text-yellow-500 w-5 h-5 lg:w-8 lg:h-8" />
                                </div>
                                <span className="text-[8px] lg:text-[10px] font-black text-yellow-500 tracking-widest">HEAD</span>

                                {/* Connecting Cable */}
                                {renderNodes.length > 0 && (
                                    <svg className="absolute top-5 lg:top-8 left-10 lg:left-16 w-4 lg:w-16 h-2 z-0 overflow-visible">
                                        <motion.line
                                            x1="0" y1="0" x2="100%" y2="0"
                                            stroke="#eab308" strokeWidth="2"
                                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }}
                                        />
                                        <circle cx="100%" cy="0" r="3" fill="#eab308" />
                                    </svg>
                                )}
                            </div>

                            <AnimatePresence mode="popLayout">
                                {renderNodes.map((node, i) => {
                                    const isSeeker = seekerIndex === i;

                                    return (
                                        <motion.div
                                            layout
                                            key={node.id}
                                            initial={{ opacity: 0, scale: 0.8, x: -50 }}
                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0, y: 100 }}
                                            className="relative flex items-center mr-2 lg:mr-6 shrink-0"
                                        >
                                            {/* NODE CONTAINER */}
                                            <div className={`
                                        w-12 h-12 lg:w-28 lg:h-28 rounded-lg lg:rounded-2xl border-2 flex flex-col items-center justify-center relative z-10 transition-all duration-500 bg-[#0a0a14]
                                        ${node.isDeleting ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' :
                                                    isSeeker ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                                                        'border-white/10'}
                                    `}>
                                                <div className="absolute top-1 lg:top-3 left-1 lg:left-3 text-[5px] lg:text-[9px] font-mono text-gray-600">0x{node.id}</div>
                                                <span className={`text-lg lg:text-3xl font-black ${isSeeker ? 'text-green-400' : 'text-white'}`}>{node.value}</span>
                                                <div className="absolute -bottom-5 lg:-bottom-8 flex flex-col items-center">
                                                    <div className="h-2 lg:h-4 w-px bg-white/10" />
                                                    <span className="text-[7px] lg:text-[10px] font-mono text-gray-500 whitespace-nowrap">INDEX {i}</span>
                                                </div>

                                                {/* THE SEEKER DRONE */}
                                                {isSeeker && (
                                                    <motion.div layoutId="seeker" className="absolute -top-10 lg:-top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-50">
                                                        <div className="bg-green-500 text-black px-2 py-0.5 lg:px-3 lg:py-1 rounded text-[7px] lg:text-[9px] font-black uppercase shadow-lg shadow-green-500/20 whitespace-nowrap">
                                                            PTR
                                                        </div>
                                                        <div className="w-0.5 h-4 lg:h-8 bg-green-500" />
                                                        <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full border-2 border-green-500 bg-black" />
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* POINTER CONNECTIONS */}
                                            {i < renderNodes.length - 1 && (
                                                <div className="w-6 lg:w-20 h-10 lg:h-12 flex flex-col justify-center relative mx-0.5 lg:mx-2">
                                                    {/* Next Pointer (Top) */}
                                                    <div className="w-full h-px bg-white/20 relative group">
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 lg:w-2 lg:h-2 border-t-2 border-r-2 border-white/20 rotate-45" />
                                                        {node.isNew && <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} className="absolute inset-0 bg-[#00f5ff] h-0.5 shadow-[0_0_10px_#00f5ff]" />}
                                                    </div>

                                                    {/* Prev Pointer (Bottom - Doubly) */}
                                                    {listType === 'doubly' && (
                                                        <div className="w-full h-px bg-purple-500/30 relative mt-1.5 lg:mt-3">
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 lg:w-2 lg:h-2 border-b-2 border-l-2 border-purple-500/50 rotate-45" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* NULL TERMINATOR */}
                                            {i === renderNodes.length - 1 && (
                                                <div className="ml-2 lg:ml-8 flex items-center gap-1.5 lg:gap-3 opacity-30">
                                                    <div className="w-4 lg:w-12 h-px bg-white" />
                                                    <div className="w-5 h-5 lg:w-10 lg:h-10 rounded-md lg:rounded-lg border border-white/50 flex items-center justify-center">
                                                        <X size={12} className="w-2.5 h-2.5 lg:w-4 lg:h-4" />
                                                    </div>
                                                    <span className="text-[7px] lg:text-[10px] font-mono">NULL</span>
                                                </div>
                                            )}

                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LinkedListVisualizer;